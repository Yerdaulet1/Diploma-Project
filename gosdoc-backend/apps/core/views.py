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
            {"id": faq.id, "topic": faq.topic, "question": faq.question, "answer": faq.answer, "order": faq.order}
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

        from apps.core.search import search_documents, search_workspaces
        from apps.workspaces.models import Workspace

        user = request.user
        results = {"documents": [], "workspaces": [], "total": 0}

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

        return Response(results)
