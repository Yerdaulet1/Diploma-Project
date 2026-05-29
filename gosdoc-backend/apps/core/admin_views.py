"""
Админ-эндпоинты ГосДок — управление пользователями и кабинетами.
Доступно только пользователям с is_staff=True.
"""
import logging

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.serializers import UserSerializer
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.workspaces.serializers import WorkspaceSerializer

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """Только пользователи с is_staff=True."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ============================================================
# USERS
# ============================================================

class AdminUserListView(APIView):
    """
    GET /api/v1/admin/users/
    Параметры: ?search=email|name  ?page=N  ?page_size=N
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.all().order_by("-created_at")
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(full_name__icontains=search))

        total = qs.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 50))))
        except ValueError:
            page, page_size = 1, 50

        start = (page - 1) * page_size
        users = qs[start:start + page_size]
        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": UserSerializer(users, many=True).data,
        })


class AdminUserDetailView(APIView):
    """
    DELETE /api/v1/admin/users/{id}/  — полное удаление пользователя.
    Самого админа удалить нельзя.
    """
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user.id == request.user.id:
            return Response({"detail": "Нельзя удалить самого себя."}, status=status.HTTP_400_BAD_REQUEST)
        email = user.email
        user.delete()
        logger.info("[admin] user deleted: %s by %s", email, request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# WORKSPACES (ORGANIZATIONS)
# ============================================================

class AdminWorkspaceListView(APIView):
    """
    GET /api/v1/admin/workspaces/
    Параметры: ?search=title  ?page=N  ?page_size=N
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            Workspace.objects.all()
            .annotate(member_count=Count("members", distinct=True))
            .annotate(doc_count=Count("documents", distinct=True))
            .order_by("-created_at")
        )
        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(title__icontains=search)

        total = qs.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(100, max(1, int(request.query_params.get("page_size", 50))))
        except ValueError:
            page, page_size = 1, 50

        start = (page - 1) * page_size
        rows = qs[start:start + page_size]
        results = []
        for ws in rows:
            results.append({
                "id": str(ws.id),
                "title": ws.title,
                "type": ws.type,
                "status": ws.status,
                "created_by": ws.created_by.email if ws.created_by_id else None,
                "created_at": ws.created_at.isoformat() if ws.created_at else None,
                "member_count": getattr(ws, "member_count", 0),
                "doc_count": getattr(ws, "doc_count", 0),
            })
        return Response({
            "count": total,
            "page": page,
            "page_size": page_size,
            "results": results,
        })


class AdminWorkspaceDetailView(APIView):
    """
    DELETE /api/v1/admin/workspaces/{id}/  — полное удаление кабинета и его содержимого.
    """
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        ws = get_object_or_404(Workspace, pk=pk)
        title = ws.title
        ws.delete()
        logger.info("[admin] workspace deleted: %s by %s", title, request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# STATS
# ============================================================

class AdminStatsView(APIView):
    """GET /api/v1/admin/stats/  — счётчики для дашборда."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.documents.models import Document
        return Response({
            "users_total": User.objects.count(),
            "users_active": User.objects.filter(is_active=True).count(),
            "users_admin": User.objects.filter(is_staff=True).count(),
            "workspaces_total": Workspace.objects.count(),
            "documents_total": Document.objects.count(),
            "memberships_total": WorkspaceMember.objects.count(),
        })
