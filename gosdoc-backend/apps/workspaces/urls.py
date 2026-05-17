"""
ГосДок — URL кабинетов (apps/workspaces/urls.py)
Раздел 4.4 ТЗ

Маршруты:
  GET    /workspaces/                        — список кабинетов
  POST   /workspaces/                        — создать кабинет
  GET    /workspaces/{id}/                   — детали
  PATCH  /workspaces/{id}/                   — обновить
  DELETE /workspaces/{id}/                   — закрыть
  GET    /workspaces/{id}/members/           — список участников
  POST   /workspaces/{id}/members/           — добавить участника
  PATCH  /workspaces/{id}/members/{uid}/     — изменить роль/step_order
  DELETE /workspaces/{id}/members/{uid}/     — удалить участника
"""

from django.urls import path

from .views import (
    WorkspaceDetailView,
    WorkspaceInvitationAcceptView,
    WorkspaceInvitationDeclineView,
    WorkspaceInviteView,
    WorkspaceListCreateView,
    WorkspaceMemberDetailView,
    WorkspaceMemberListCreateView,
    WorkspacePendingInvitationsView,
)

urlpatterns = [
    # Кабинеты
    path("", WorkspaceListCreateView.as_view(), name="workspace-list"),
    path("invitations/pending/", WorkspacePendingInvitationsView.as_view(), name="workspace-invitations-pending"),
    path("<uuid:pk>/", WorkspaceDetailView.as_view(), name="workspace-detail"),

    # Участники
    path("<uuid:pk>/members/", WorkspaceMemberListCreateView.as_view(), name="workspace-members"),
    path("<uuid:pk>/members/<uuid:uid>/", WorkspaceMemberDetailView.as_view(), name="workspace-member-detail"),

    # Приглашения
    path("<uuid:pk>/invite/", WorkspaceInviteView.as_view(), name="workspace-invite"),
    path("<uuid:pk>/invitations/<uuid:inv_id>/accept/",  WorkspaceInvitationAcceptView.as_view(),  name="workspace-invitation-accept"),
    path("<uuid:pk>/invitations/<uuid:inv_id>/decline/", WorkspaceInvitationDeclineView.as_view(), name="workspace-invitation-decline"),
]
