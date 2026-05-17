"""
ГосДок — Views организаций (apps/organizations/views.py)
"""

import logging

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import UserListSerializer
from .models import Organization, OrganizationInvitation
from .permissions import IsOrganizationMember, IsOrganizationOwner
from .serializers import InviteMemberSerializer, OrganizationListSerializer, OrganizationSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class OrganizationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return OrganizationSerializer if self.request.method == "POST" else OrganizationListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Organization.objects.all().order_by("-created_at")
        return (
            Organization.objects.filter(users__id=user.id)
            | Organization.objects.filter(owner=user)
        ).distinct().order_by("-created_at")


class OrganizationDetailView(generics.RetrieveUpdateAPIView):
    queryset = Organization.objects.prefetch_related("users")

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT"):
            return [permissions.IsAuthenticated(), IsOrganizationOwner()]
        return [permissions.IsAuthenticated(), IsOrganizationMember()]

    def get_serializer_class(self):
        return OrganizationSerializer


class OrganizationMembersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserListSerializer

    def get_queryset(self):
        org = get_object_or_404(Organization, pk=self.kwargs["pk"])
        is_member = (
            org.owner == self.request.user
            or org.users.filter(id=self.request.user.id).exists()
            or self.request.user.is_staff
        )
        if not is_member:
            raise PermissionDenied("Вы не являетесь членом этой организации.")
        return User.objects.filter(organization_id=self.kwargs["pk"], is_active=True).order_by("full_name")


class OrganizationInviteView(APIView):
    """
    POST /api/v1/organizations/{id}/invite/
    Создаёт приглашение (OrganizationInvitation) и уведомление для приглашённого.
    Body: { email, workspace_id (optional), role (optional) }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        org = get_object_or_404(Organization, pk=pk)

        if org.owner != request.user and not request.user.is_staff:
            raise PermissionDenied("Только владелец организации может приглашать участников.")

        serializer = InviteMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email        = serializer.validated_data["email"]
        workspace_id = serializer.validated_data.get("workspace_id")
        role         = serializer.validated_data.get("role", "viewer")

        user = get_object_or_404(User, email=email, is_active=True)

        if user.organization_id == org.id:
            return Response(
                {"detail": f"Пользователь {email} уже состоит в этой организации."},
                status=status.HTTP_409_CONFLICT,
            )

        # Если есть pending-приглашение — сообщаем об этом
        pending = OrganizationInvitation.objects.filter(
            organization=org, invitee=user, status=OrganizationInvitation.Status.PENDING
        ).first()
        if pending:
            return Response(
                {"detail": f"Приглашение для {email} уже отправлено и ожидает ответа."},
                status=status.HTTP_409_CONFLICT,
            )

        # Если есть declined — разрешаем повторно пригласить (создаём новое)
        workspace = None
        if workspace_id:
            from apps.workspaces.models import Workspace
            workspace = Workspace.objects.filter(pk=workspace_id).first()

        invitation = OrganizationInvitation.objects.create(
            organization=org,
            invitee=user,
            inviter=request.user,
            workspace=workspace,
            role=role,
        )

        from apps.notifications.models import Notification
        ws_part = f" в кабинет «{workspace.title}»" if workspace else ""
        Notification.objects.create(
            user=user,
            type=Notification.NotificationType.ORG_INVITATION,
            title=f"Приглашение в организацию «{org.name}»",
            message=f"{request.user.full_name} приглашает вас вступить в организацию «{org.name}»{ws_part}.",
            entity_type="org_invitation",
            entity_id=invitation.id,
        )

        logger.info("Приглашение отправлено: %s → орг. '%s' ws=%s (by %s)", email, org.name, workspace_id, request.user.email)
        return Response({"detail": f"Приглашение отправлено пользователю {email}."}, status=status.HTTP_200_OK)


# ── Сериализатор приглашения ─────────────────────────────────────────────────

class OrganizationInvitationSerializer(serializers.ModelSerializer):
    organization_id   = serializers.UUIDField(source="organization.id")
    organization_name = serializers.CharField(source="organization.name")
    inviter_name      = serializers.CharField(source="inviter.full_name")
    inviter_email     = serializers.CharField(source="inviter.email")
    workspace_id      = serializers.UUIDField(source="workspace.id", allow_null=True)
    workspace_name    = serializers.CharField(source="workspace.title", allow_null=True)

    class Meta:
        model  = OrganizationInvitation
        fields = [
            "id", "organization_id", "organization_name",
            "inviter_name", "inviter_email",
            "workspace_id", "workspace_name", "role",
            "status", "created_at",
        ]


# ── Pending invitations для текущего пользователя ───────────────────────────

class PendingInvitationsView(APIView):
    """GET /api/v1/organizations/invitations/pending/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invitations = OrganizationInvitation.objects.filter(
            invitee=request.user,
            status=OrganizationInvitation.Status.PENDING,
        ).select_related("organization", "inviter")
        return Response(OrganizationInvitationSerializer(invitations, many=True).data)


# ── Accept / Decline ─────────────────────────────────────────────────────────

class InvitationAcceptView(APIView):
    """POST /api/v1/organizations/{pk}/invitations/{inv_id}/accept/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, inv_id):
        invitation = get_object_or_404(
            OrganizationInvitation,
            pk=inv_id,
            organization_id=pk,
            invitee=request.user,
            status=OrganizationInvitation.Status.PENDING,
        )
        invitation.status = OrganizationInvitation.Status.ACCEPTED
        invitation.save(update_fields=["status"])

        user = request.user
        user.organization = invitation.organization
        user.save(update_fields=["organization"])

        # Если приглашение привязано к конкретному кабинету — добавляем участником
        if invitation.workspace:
            from apps.workspaces.models import WorkspaceMember
            WorkspaceMember.objects.get_or_create(
                workspace=invitation.workspace,
                user=user,
                defaults={"role": invitation.role or "viewer"},
            )

        from apps.notifications.models import Notification
        Notification.objects.create(
            user=invitation.inviter,
            type=Notification.NotificationType.STEP_COMPLETED,
            title=f"{user.full_name} принял(а) приглашение",
            message=f"Пользователь {user.email} вступил(а) в организацию «{invitation.organization.name}».",
            entity_type="organization",
            entity_id=invitation.organization.id,
        )

        logger.info("%s принял приглашение в орг. '%s'", user.email, invitation.organization.name)
        return Response({"detail": "Вы успешно вступили в организацию."})


class InvitationDeclineView(APIView):
    """POST /api/v1/organizations/{pk}/invitations/{inv_id}/decline/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, inv_id):
        invitation = get_object_or_404(
            OrganizationInvitation,
            pk=inv_id,
            organization_id=pk,
            invitee=request.user,
            status=OrganizationInvitation.Status.PENDING,
        )
        invitation.status = OrganizationInvitation.Status.DECLINED
        invitation.save(update_fields=["status"])

        logger.info("%s отклонил приглашение в орг. '%s'", request.user.email, invitation.organization.name)
        return Response({"detail": "Приглашение отклонено."})
