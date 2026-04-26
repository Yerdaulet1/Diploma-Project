"""
ГосДок — Сериализаторы для пользователей (apps/users/serializers.py)
Покрывает разделы 4.1, 4.2 ТЗ
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserSettings

User = get_user_model()


# ============================================================
# JWT — кастомный serializer, добавляем данные пользователя в токен
# ============================================================
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Расширяет стандартный JWT-сериализатор:
    добавляет email и full_name в payload токена.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Добавляем базовую информацию о пользователе в ответ
        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "full_name": self.user.full_name,
        }
        return data


# ============================================================
# Регистрация пользователя
# ============================================================
class RegisterSerializer(serializers.ModelSerializer):
    """Сериализатор регистрации — POST /api/v1/auth/register/"""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    org_name = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        help_text="Название организации (опционально — создаётся автоматически)",
    )

    class Meta:
        model = User
        fields = ["email", "full_name", "phone", "password", "password_confirm", "org_name"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают."})
        return attrs

    def create(self, validated_data):
        from apps.organizations.models import Organization

        validated_data.pop("password_confirm")
        org_name = validated_data.pop("org_name", "").strip()

        user = User.objects.create_user(**validated_data)

        if org_name:
            org = Organization.objects.create(
                name=org_name,
                type=Organization.OrgType.INDIVIDUAL,
                owner=user,
            )
            user.organization = org
            user.save(update_fields=["organization"])

        return user


# ============================================================
# Смена пароля
# ============================================================
class ChangePasswordSerializer(serializers.Serializer):
    """Сериализатор смены пароля — POST /api/v1/auth/password/change/"""

    old_password = serializers.CharField(required=True, style={"input_type": "password"})
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Новые пароли не совпадают."}
            )
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Неверный текущий пароль.")
        return value


# ============================================================
# Сброс пароля (запрос)
# ============================================================
class PasswordResetRequestSerializer(serializers.Serializer):
    """Сериализатор запроса сброса пароля — POST /api/v1/auth/password/reset/"""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower()


class VerifyEmailSerializer(serializers.Serializer):
    """Подтверждение email кодом — POST /api/v1/auth/verify-email/"""

    email = serializers.EmailField(required=True)
    code = serializers.CharField(min_length=6, max_length=6, required=True)

    def validate_email(self, value):
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Сброс пароля по коду — POST /api/v1/auth/password/reset/confirm/"""

    email = serializers.EmailField(required=True)
    code = serializers.CharField(min_length=6, max_length=6, required=True)
    new_password = serializers.CharField(
        min_length=8,
        required=True,
        validators=[__import__("django.contrib.auth.password_validation", fromlist=["validate_password"]).validate_password],
    )

    def validate_email(self, value):
        return value.lower()


# ============================================================
# Профиль пользователя (чтение/редактирование)
# ============================================================
class UserSerializer(serializers.ModelSerializer):
    """Сериализатор профиля пользователя — GET/PATCH /api/v1/users/{id}/"""

    organization_name = serializers.CharField(
        source="organization.name",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "phone",
            "organization", "organization_name",
            "avatar_url",
            "is_active", "created_at", "last_login",
        ]
        read_only_fields = ["id", "email", "is_active", "created_at", "last_login", "avatar_url"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор обновления профиля (только изменяемые поля)."""

    class Meta:
        model = User
        fields = ["full_name", "phone"]


class UserListSerializer(serializers.ModelSerializer):
    """Краткое представление пользователя для списков."""

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "is_active", "created_at"]
        read_only_fields = fields


# ============================================================
# UserSettings
# ============================================================

class UserSettingsSerializer(serializers.ModelSerializer):
    """GET/PATCH /api/v1/users/me/settings/"""

    class Meta:
        model = UserSettings
        fields = ["notification_email", "notification_push", "language", "theme", "updated_at"]
        read_only_fields = ["updated_at"]


# ============================================================
# Avatar upload (presigned POST, 2-step)
# ============================================================

class AvatarRequestUploadSerializer(serializers.Serializer):
    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)

    def validate_file_name(self, value):
        allowed = {"jpg", "jpeg", "png", "webp", "gif"}
        ext = value.rsplit(".", 1)[-1].lower() if "." in value else ""
        if ext not in allowed:
            raise serializers.ValidationError("Разрешены только изображения: jpg, jpeg, png, webp, gif.")
        return value

    def validate_file_size(self, value):
        if value > 5 * 1024 * 1024:
            raise serializers.ValidationError("Аватар не должен превышать 5 МБ.")
        return value


class AvatarConfirmSerializer(serializers.Serializer):
    storage_key = serializers.CharField()


# ============================================================
# Change-email OTP flow
# ============================================================

class ChangeEmailRequestSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("Этот email уже используется.")
        return value


class ChangeEmailConfirmSerializer(serializers.Serializer):
    new_email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_new_email(self, value):
        return value.lower().strip()
