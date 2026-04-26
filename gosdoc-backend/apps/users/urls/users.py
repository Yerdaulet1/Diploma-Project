"""
ГосДок — URL пользователей (apps/users/urls/users.py)
Раздел 4.2 ТЗ
"""

from django.urls import path

from apps.users.views import (
    AvatarConfirmView,
    AvatarRequestUploadView,
    ChangeEmailConfirmView,
    ChangeEmailRequestView,
    UserDetailView,
    UserListView,
    UserMeView,
    UserSettingsView,
)

urlpatterns = [
    # GET  /api/v1/users/
    path("", UserListView.as_view(), name="user-list"),
    # GET/PATCH/DELETE /api/v1/users/me/
    path("me/", UserMeView.as_view(), name="user-me"),
    # Avatar (Phase 11)
    path("me/avatar/request-upload/", AvatarRequestUploadView.as_view(), name="user-avatar-request"),
    path("me/avatar/confirm/", AvatarConfirmView.as_view(), name="user-avatar-confirm"),
    # Settings (Phase 11)
    path("me/settings/", UserSettingsView.as_view(), name="user-settings"),
    # Change-email OTP (Phase 11)
    path("me/change-email/request/", ChangeEmailRequestView.as_view(), name="user-change-email-request"),
    path("me/change-email/confirm/", ChangeEmailConfirmView.as_view(), name="user-change-email-confirm"),
    # GET/PATCH/DELETE /api/v1/users/{id}/
    path("<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),
]
