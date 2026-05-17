"""
ГосДок — Views рабочих кабинетов (apps/workspaces/views.py)
Раздел 4.4 ТЗ

Маршруты:
  GET    /workspaces/                          — список кабинетов пользователя
  POST   /workspaces/                          — создать кабинет
  GET    /workspaces/{id}/                     — детали (Member)
  PATCH  /workspaces/{id}/                     — обновить (Owner)
  DELETE /workspaces/{id}/                     — закрыть (Owner)
  GET    /workspaces/{id}/members/             — список участников (Member)
  POST   /workspaces/{id}/members/             — добавить участника (Owner)
  PATCH  /workspaces/{id}/members/{uid}/       — изменить роль/step_order (Owner)
  DELETE /workspaces/{id}/members/{uid}/       — удалить участника (Owner)
"""

import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Workspace, WorkspaceMember, WorkspaceInvitation
from .serializers import (
    AddMemberSerializer,
    WorkspaceInvitationSerializer,
    WorkspaceInviteRequestSerializer,
    WorkspaceListSerializer,
    WorkspaceMemberSerializer,
    WorkspaceMemberUpdateSerializer,
    WorkspaceSerializer,
    WorkspaceUpdateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ============================================================
# Вспомогательные проверки
# ============================================================

def require_workspace_owner(user, workspace):
    """Поднимает PermissionDenied, если пользователь не owner.
    Создатель кабинета всегда имеет права владельца."""
    is_owner = workspace.members.filter(user=user, role=WorkspaceMember.Role.OWNER).exists()
    is_creator = workspace.created_by_id == user.pk
    if not is_owner and not is_creator and not user.is_staff:
        raise PermissionDenied("Только владелец кабинета может выполнить это действие.")


def require_workspace_member(user, workspace):
    """Поднимает PermissionDenied, если пользователь не участник."""
    is_member = workspace.members.filter(user=user).exists()
    if not is_member and not user.is_staff:
        raise PermissionDenied("Вы не являетесь участником этого кабинета.")


# ============================================================
# 4.4 CRUD кабинетов
# ============================================================

class WorkspaceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/workspaces/ — список кабинетов текущего пользователя
    POST /api/v1/workspaces/ — создать кабинет
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkspaceSerializer
        return WorkspaceListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Workspace.objects.filter(members__user=user)
            .select_related("organization", "created_by")
            .prefetch_related("members", "documents")
            .distinct()
            .order_by("-created_at")
        )
        # Фильтрация по статусу
        status_filter = self.request.query_params.get("status")
        type_filter = self.request.query_params.get("type")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if type_filter:
            qs = qs.filter(type=type_filter)
        return qs


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/workspaces/{id}/ — JWT + Member
    PATCH  /api/v1/workspaces/{id}/ — JWT + Owner
    DELETE /api/v1/workspaces/{id}/ — JWT + Owner
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return WorkspaceUpdateSerializer
        return WorkspaceSerializer

    def get_queryset(self):
        return (
            Workspace.objects.filter(members__user=self.request.user)
            .select_related("organization", "created_by")
            .prefetch_related("members__user")
            .distinct()
        )

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ("PATCH", "PUT", "DELETE"):
            require_workspace_owner(request.user, obj)
        else:
            require_workspace_member(request.user, obj)

    def destroy(self, request, *args, **kwargs):
        """Мягкое закрытие: статус closed, без физического удаления."""
        workspace = self.get_object()
        workspace.status = Workspace.WorkspaceStatus.CLOSED
        workspace.save(update_fields=["status"])
        logger.info("Кабинет '%s' закрыт пользователем %s", workspace.title, request.user.email)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# 4.4 Управление участниками
# ============================================================

class WorkspaceMemberListCreateView(APIView):
    """
    GET  /api/v1/workspaces/{id}/members/ — список участников (JWT + Member)
    POST /api/v1/workspaces/{id}/members/ — добавить участника (JWT + Owner)
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_workspace(self, pk):
        return get_object_or_404(
            Workspace.objects.prefetch_related("members__user"),
            pk=pk,
        )

    @extend_schema(responses=WorkspaceMemberSerializer(many=True))
    def get(self, request, pk):
        workspace = self._get_workspace(pk)
        require_workspace_member(request.user, workspace)

        members = workspace.members.select_related("user").order_by("step_order", "joined_at")
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data)

    @extend_schema(request=AddMemberSerializer, responses={201: WorkspaceMemberSerializer})
    def post(self, request, pk):
        workspace = self._get_workspace(pk)
        require_workspace_owner(request.user, workspace)

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["resolved_user"]

        # Проверяем лимит для индивидуального кабинета (раздел 2.1 ТЗ: до 20 пользователей)
        if workspace.type == Workspace.WorkspaceType.INDIVIDUAL:
            current_count = workspace.members.count()
            if current_count >= 20:
                return Response(
                    {"detail": "Индивидуальный кабинет не может иметь более 20 участников (раздел 2.1 ТЗ)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existing = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
        if existing:
            # Пользователь уже участник — обновляем role и step_order
            existing.role = serializer.validated_data["role"]
            existing.step_order = serializer.validated_data.get("step_order")
            existing.save(update_fields=["role", "step_order"])
            member = existing
        else:
            member = WorkspaceMember.objects.create(
                workspace=workspace,
                user=user,
                role=serializer.validated_data["role"],
                step_order=serializer.validated_data.get("step_order"),
            )

        logger.info(
            "Участник %s добавлен в кабинет '%s' с ролью %s",
            user.email, workspace.title, member.role,
        )

        # Уведомляем нового участника
        from apps.notifications.models import Notification
        Notification.objects.create(
            user=user,
            type=Notification.NotificationType.TASK_ASSIGNED,
            title=f"Вы добавлены в кабинет «{workspace.title}»",
            message=f"Ваша роль: {member.get_role_display()}.",
            entity_type="workspace",
            entity_id=workspace.id,
        )

        return Response(WorkspaceMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class WorkspaceMemberDetailView(APIView):
    """
    PATCH  /api/v1/workspaces/{id}/members/{uid}/ — изменить роль/step_order (Owner)
    DELETE /api/v1/workspaces/{id}/members/{uid}/ — удалить участника (Owner)
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_objects(self, pk, uid):
        workspace = get_object_or_404(
            Workspace.objects.prefetch_related("members"),
            pk=pk,
        )
        require_workspace_owner(self.request.user, workspace)
        member = get_object_or_404(WorkspaceMember, workspace=workspace, user_id=uid)
        return workspace, member

    @extend_schema(request=WorkspaceMemberUpdateSerializer, responses=WorkspaceMemberSerializer)
    def patch(self, request, pk, uid):
        workspace, member = self._get_objects(pk, uid)

        # Нельзя понизить последнего owner
        if (
            member.role == WorkspaceMember.Role.OWNER
            and request.data.get("role")
            and request.data["role"] != WorkspaceMember.Role.OWNER
        ):
            owners_count = workspace.members.filter(role=WorkspaceMember.Role.OWNER).count()
            if owners_count <= 1:
                return Response(
                    {"detail": "Нельзя убрать единственного владельца кабинета."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = WorkspaceMemberUpdateSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(
            "Участник %s в кабинете '%s': роль/step_order обновлены (by %s)",
            member.user.email, workspace.title, request.user.email,
        )
        return Response(WorkspaceMemberSerializer(member).data)

    def delete(self, request, pk, uid):
        workspace, member = self._get_objects(pk, uid)

        # Нельзя удалить последнего owner
        if member.role == WorkspaceMember.Role.OWNER:
            owners_count = workspace.members.filter(role=WorkspaceMember.Role.OWNER).count()
            if owners_count <= 1:
                return Response(
                    {"detail": "Нельзя удалить единственного владельца кабинета."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Нельзя удалить самого себя через этот эндпоинт
        if member.user == request.user:
            return Response(
                {"detail": "Для выхода из кабинета используйте /workspaces/{id}/leave/."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_email = member.user.email
        member.delete()
        logger.info(
            "Участник %s удалён из кабинета '%s' (by %s)",
            user_email, workspace.title, request.user.email,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# Workspace Invitations
# ============================================================

class WorkspaceInviteView(APIView):
    """POST /api/v1/workspaces/{id}/invite/  — отправить приглашение"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        workspace = get_object_or_404(Workspace, pk=pk)
        require_workspace_owner(request.user, workspace)

        serializer = WorkspaceInviteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role  = serializer.validated_data.get("role", "viewer")
        invitee = get_object_or_404(User, email=email, is_active=True)

        if workspace.members.filter(user=invitee).exists():
            return Response(
                {"detail": f"Пользователь {email} уже является участником кабинета."},
                status=status.HTTP_409_CONFLICT,
            )

        pending = WorkspaceInvitation.objects.filter(
            workspace=workspace, invitee=invitee,
            status=WorkspaceInvitation.Status.PENDING,
        ).first()
        if pending:
            return Response(
                {"detail": f"Приглашение для {email} уже отправлено и ожидает ответа."},
                status=status.HTTP_409_CONFLICT,
            )

        invitation = WorkspaceInvitation.objects.create(
            workspace=workspace,
            invitee=invitee,
            inviter=request.user,
            role=role,
        )

        from apps.notifications.models import Notification
        Notification.objects.create(
            user=invitee,
            type=Notification.NotificationType.ORG_INVITATION,
            title=f"Приглашение в кабинет «{workspace.title}»",
            message=f"{request.user.full_name} приглашает вас в кабинет «{workspace.title}» с ролью {role}.",
            entity_type="workspace_invitation",
            entity_id=invitation.id,
        )

        logger.info("Приглашение в кабинет '%s' отправлено: %s (by %s)", workspace.title, email, request.user.email)
        return Response({"detail": f"Приглашение отправлено пользователю {email}."}, status=status.HTTP_200_OK)


class WorkspacePendingInvitationsView(APIView):
    """GET /api/v1/workspaces/invitations/pending/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invitations = WorkspaceInvitation.objects.filter(
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING,
        ).select_related("workspace", "inviter")
        return Response(WorkspaceInvitationSerializer(invitations, many=True).data)


class WorkspaceInvitationAcceptView(APIView):
    """POST /api/v1/workspaces/{id}/invitations/{inv_id}/accept/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, inv_id):
        invitation = get_object_or_404(
            WorkspaceInvitation,
            pk=inv_id,
            workspace_id=pk,
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING,
        )
        invitation.status = WorkspaceInvitation.Status.ACCEPTED
        invitation.save(update_fields=["status"])

        WorkspaceMember.objects.get_or_create(
            workspace=invitation.workspace,
            user=request.user,
            defaults={"role": invitation.role},
        )

        from apps.notifications.models import Notification
        Notification.objects.create(
            user=invitation.inviter,
            type=Notification.NotificationType.STEP_COMPLETED,
            title=f"{request.user.full_name} принял(а) приглашение",
            message=f"{request.user.email} вступил(а) в кабинет «{invitation.workspace.title}».",
            entity_type="workspace",
            entity_id=invitation.workspace.id,
        )

        logger.info("%s принял приглашение в кабинет '%s'", request.user.email, invitation.workspace.title)
        return Response({"detail": "Вы успешно вступили в кабинет."})


class WorkspaceInvitationDeclineView(APIView):
    """POST /api/v1/workspaces/{id}/invitations/{inv_id}/decline/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, inv_id):
        invitation = get_object_or_404(
            WorkspaceInvitation,
            pk=inv_id,
            workspace_id=pk,
            invitee=request.user,
            status=WorkspaceInvitation.Status.PENDING,
        )
        invitation.status = WorkspaceInvitation.Status.DECLINED
        invitation.save(update_fields=["status"])

        logger.info("%s отклонил приглашение в кабинет '%s'", request.user.email, invitation.workspace.title)
        return Response({"detail": "Приглашение отклонено."})
