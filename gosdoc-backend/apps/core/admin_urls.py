"""Admin URL routes — /api/v1/admin/..."""
from django.urls import path

from .admin_views import (
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListView,
    AdminWorkspaceDetailView,
    AdminWorkspaceListView,
)

urlpatterns = [
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("users/", AdminUserListView.as_view(), name="admin-users"),
    path("users/<uuid:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("workspaces/", AdminWorkspaceListView.as_view(), name="admin-workspaces"),
    path("workspaces/<uuid:pk>/", AdminWorkspaceDetailView.as_view(), name="admin-workspace-detail"),
]
