from django.urls import path
from .views import (
    OrganizationDetailView,
    OrganizationInviteView,
    OrganizationListCreateView,
    OrganizationMembersView,
    PendingInvitationsView,
    InvitationAcceptView,
    InvitationDeclineView,
)

urlpatterns = [
    path("", OrganizationListCreateView.as_view(), name="organization-list"),
    path("invitations/pending/", PendingInvitationsView.as_view(), name="org-invitations-pending"),
    path("<uuid:pk>/", OrganizationDetailView.as_view(), name="organization-detail"),
    path("<uuid:pk>/members/", OrganizationMembersView.as_view(), name="organization-members"),
    path("<uuid:pk>/invite/", OrganizationInviteView.as_view(), name="organization-invite"),
    path("<uuid:pk>/invitations/<uuid:inv_id>/accept/",  InvitationAcceptView.as_view(),  name="org-invitation-accept"),
    path("<uuid:pk>/invitations/<uuid:inv_id>/decline/", InvitationDeclineView.as_view(), name="org-invitation-decline"),
]
