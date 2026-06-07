"""
ГосДок — Views Core (apps/core/views.py)
"""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FAQ


class FaqListView(APIView):
    """
    GET /api/v1/help/faqs/
    Returns active FAQs, optionally filtered by ?topic=platform|tasks|orgs.
    No authentication required — public endpoint.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = FAQ.objects.filter(is_active=True)
        topic = request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic=topic)
        data = [
            {
                "id": faq.id,
                "topic": faq.topic,
                "order": faq.order,
                "question": faq.question,
                "answer": faq.answer,
                "question_ru": faq.question_ru or faq.question,
                "answer_ru": faq.answer_ru or faq.answer,
                "question_kk": faq.question_kk or faq.question,
                "answer_kk": faq.answer_kk or faq.answer,
            }
            for faq in qs
        ]
        return Response(data)


class GlobalSearchView(APIView):
    """
    GET /api/v1/help/search/?q=...&limit=20&offset=0&type=documents,workspaces
    Глобальный поиск через MeiliSearch по документам и workspace'ам.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"documents": [], "workspaces": [], "total": 0})

        limit  = min(int(request.query_params.get("limit",  20)), 50)
        offset = int(request.query_params.get("offset", 0))
        types  = request.query_params.get("type", "documents,workspaces").split(",")

        from apps.core.search import get_client, search_documents, search_workspaces
        from apps.workspaces.models import Workspace

        user = request.user
        results = {"documents": [], "workspaces": [], "total": 0}

        # MeiliSearch — опционально. Если оно не запущено, gracefully падаем на
        # поиск через PostgreSQL (icontains), чтобы глобальный поиск работал всегда.
        meili_available = get_client() is not None

        if meili_available:
            if "documents" in types:
                workspace_ids = list(
                    Workspace.objects.filter(members__user=user)
                    .values_list("id", flat=True)
                    .distinct()
                )
                ws_id_strs = [str(w) for w in workspace_ids]
                doc_result = search_documents(query, ws_id_strs, limit=limit, offset=offset)
                results["documents"] = doc_result.get("hits", [])
                results["total"] += doc_result.get("estimatedTotalHits", 0)

            if "workspaces" in types:
                ws_result = search_workspaces(query, str(user.id))
                results["workspaces"] = ws_result.get("hits", [])
                results["total"] += ws_result.get("estimatedTotalHits", 0)
        else:
            results = self._postgres_fallback(query, user, types, limit)

        return Response(results)

    def _postgres_fallback(self, query, user, types, limit):
        """Поиск через PostgreSQL (icontains) — когда MeiliSearch недоступен."""
        from apps.documents.models import Document
        from apps.workspaces.models import Workspace

        results = {"documents": [], "workspaces": [], "total": 0}

        if "documents" in types:
            docs = (
                Document.objects
                .filter(workspace__members__user=user, title__icontains=query)
                .exclude(status="archived")
                .select_related("workspace")
                .distinct()
                .order_by("-updated_at")[:limit]
            )
            results["documents"] = [
                {
                    "id": str(d.id),
                    "title": d.title,
                    "file_type": d.file_type,
                    "status": d.status,
                    "workspace_id": str(d.workspace_id),
                    "workspace_title": d.workspace.title if d.workspace else "",
                }
                for d in docs
            ]
            results["total"] += len(results["documents"])

        if "workspaces" in types:
            wss = (
                Workspace.objects
                .filter(members__user=user, title__icontains=query)
                .distinct()
                .order_by("-created_at")[:limit]
            )
            results["workspaces"] = [
                {"id": str(w.id), "title": w.title, "type": w.type, "description": w.description or ""}
                for w in wss
            ]
            results["total"] += len(results["workspaces"])

        return results
