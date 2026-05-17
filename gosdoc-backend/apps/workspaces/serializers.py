"""
ГосДок — Сериализаторы кабинетов (apps/workspaces/serializers.py)
Раздел 4.4 ТЗ
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Workspace, WorkspaceMember, WorkspaceInvitation

User = get_user_model()


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Полный сериализатор участника кабинета."""
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            "id", "workspace", "user", "user_email", "user_name",
            "role", "step_order", "joined_at",
        ]
        read_only_fields = ["id", "workspace", "joined_at"]


class WorkspaceMemberUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для PATCH участника — можно менять только роль и step_order."""

    class Meta:
        model = WorkspaceMember
        fields = ["role", "step_order"]


class AddMemberSerializer(serializers.Serializer):
    """
    Добавление участника в кабинет.
    POST /api/v1/workspaces/{id}/members/
    Принимает email (ищет юзера) или user_id (UUID) для обратной совместимости.
    """
    email = serializers.EmailField(
        required=False,
        help_text="Email пользователя для добавления в кабинет",
    )
    user_id = serializers.UUIDField(
        required=False,
        help_text="UUID пользователя (альтернатива email)",
    )
    role = serializers.ChoiceField(
        choices=WorkspaceMember.Role.choices,
        required=True,
        help_text="Роль: owner | editor | signer | viewer",
    )
    step_order = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        help_text="Порядок шага в workflow (опционально)",
    )

    def validate(self, attrs):
        email = attrs.get("email")
        user_id = attrs.get("user_id")

        if not email and not user_id:
            raise serializers.ValidationError("Укажите email или user_id.")

        if email:
            user = User.objects.filter(email=email.lower(), is_active=True).first()
            if not user:
                raise serializers.ValidationError(
                    {"email": f"Пользователь с email {email} не найден или неактивен."}
                )
            attrs["resolved_user"] = user
        else:
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if not user:
                raise serializers.ValidationError(
                    {"user_id": "Пользователь не найден или неактивен."}
                )
            attrs["resolved_user"] = user

        return attrs


class WorkspaceSerializer(serializers.ModelSerializer):
    """Полный сериализатор кабинета."""
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id", "title", "type", "organization", "organization_name",
            "created_by", "created_by_name",
            "status", "description", "deadline",
            "created_at", "members_count",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_members_count(self, obj) -> int:
        return obj.members.count()

    def create(self, validated_data):
        user = self.context["request"].user
        # Если organization не передана — берём из профиля пользователя
        if "organization" not in validated_data and user.organization:
            validated_data["organization"] = user.organization
        workspace = Workspace.objects.create(created_by=user, **validated_data)
        # Создатель автоматически получает роль owner
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role=WorkspaceMember.Role.OWNER,
            step_order=None,  # owner не участвует в workflow-шагах по умолчанию
        )
        return workspace

    def validate(self, attrs):
        request = self.context.get("request")
        workspace_type = attrs.get("type") or (self.instance.type if self.instance else None)
        organization = attrs.get("organization") or (self.instance.organization if self.instance else None)

        # Проверяем лимит для индивидуального кабинета (раздел 2.1 ТЗ)
        if workspace_type == Workspace.WorkspaceType.INDIVIDUAL and organization and request:
            existing_count = Workspace.objects.filter(
                organization=organization,
                type=Workspace.WorkspaceType.INDIVIDUAL,
                status=Workspace.WorkspaceStatus.ACTIVE,
            ).count()
            # При создании проверяем лимит 20 документов не здесь,
            # а на уровне загрузки документов (workspace level)
        return attrs


class WorkspaceListSerializer(serializers.ModelSerializer):
    """Краткий вид кабинета для списков."""
    organization_name = serializers.CharField(source="organization.name", read_only=True, allow_null=True)
    user_role         = serializers.SerializerMethodField()
    members_count     = serializers.SerializerMethodField()
    documents_count   = serializers.SerializerMethodField()
    created_by_name   = serializers.CharField(source="created_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model = Workspace
        fields = [
            "id", "title", "type", "organization_name",
            "status", "deadline", "created_at",
            "user_role", "members_count", "documents_count", "created_by_name",
        ]
        read_only_fields = fields

    def get_user_role(self, obj) -> str | None:
        request = self.context.get("request")
        if not request:
            return None
        if obj.created_by_id and obj.created_by_id == request.user.pk:
            return "owner"
        member = obj.members.filter(user=request.user).first()
        return member.role if member else None

    def get_members_count(self, obj) -> int:
        return obj.members.count()

    def get_documents_count(self, obj) -> int:
        return obj.documents.exclude(status="archived").count()


class WorkspaceUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для PATCH кабинета — только изменяемые поля."""

    class Meta:
        model = Workspace
        fields = ["title", "description", "deadline", "status"]


class WorkspaceInviteRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role  = serializers.ChoiceField(
        choices=["owner", "editor", "signer", "viewer"],
        default="viewer",
        required=False,
    )

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Пользователь с таким email не найден.")
        return value


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    workspace_id   = serializers.UUIDField(source="workspace.id")
    workspace_name = serializers.CharField(source="workspace.title")
    inviter_name   = serializers.CharField(source="inviter.full_name")
    inviter_email  = serializers.CharField(source="inviter.email")

    class Meta:
        model  = WorkspaceInvitation
        fields = [
            "id", "workspace_id", "workspace_name",
            "inviter_name", "inviter_email",
            "role", "status", "created_at",
        ]
