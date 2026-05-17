import api from "./client";

export const getOrganizations = () =>
  api.get("/organizations/").then((r) => r.data);

export const createOrganization = (data) =>
  api.post("/organizations/", data).then((r) => r.data);

export const getOrganization = (id) =>
  api.get(`/organizations/${id}/`).then((r) => r.data);

export const updateOrganization = (id, data) =>
  api.patch(`/organizations/${id}/`, data).then((r) => r.data);

export const getOrgMembers = (id) =>
  api.get(`/organizations/${id}/members/`).then((r) => r.data);

export const inviteToOrg = (orgId, email, workspaceId = null, role = "viewer") =>
  api.post(`/organizations/${orgId}/invite/`, {
    email,
    ...(workspaceId && { workspace_id: workspaceId }),
    role,
  }).then((r) => r.data);

export const getPendingInvitations = () =>
  api.get("/organizations/invitations/pending/").then((r) => r.data);

export const acceptInvitation = (orgId, invId) =>
  api.post(`/organizations/${orgId}/invitations/${invId}/accept/`).then((r) => r.data);

export const declineInvitation = (orgId, invId) =>
  api.post(`/organizations/${orgId}/invitations/${invId}/decline/`).then((r) => r.data);
