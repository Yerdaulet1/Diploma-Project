import api from "./client";

export const getWorkspaces = (params) =>
  api.get("/workspaces/", { params }).then((r) => r.data);

export const createWorkspace = (data) =>
  api.post("/workspaces/", data).then((r) => r.data);

export const getWorkspace = (id) =>
  api.get(`/workspaces/${id}/`).then((r) => r.data);

export const updateWorkspace = (id, data) =>
  api.patch(`/workspaces/${id}/`, data).then((r) => r.data);

export const deleteWorkspace = (id) =>
  api.delete(`/workspaces/${id}/`).then((r) => r.data);

export const getMembers = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/members/`).then((r) => r.data);

export const addMember = (workspaceId, data) =>
  api.post(`/workspaces/${workspaceId}/members/`, data).then((r) => r.data);

export const updateMember = (workspaceId, userId, data) =>
  api
    .patch(`/workspaces/${workspaceId}/members/${userId}/`, data)
    .then((r) => r.data);

export const removeMember = (workspaceId, userId) =>
  api
    .delete(`/workspaces/${workspaceId}/members/${userId}/`)
    .then((r) => r.data);

export const inviteToWorkspace = (workspaceId, email, role = "viewer") =>
  api.post(`/workspaces/${workspaceId}/invite/`, { email, role }).then((r) => r.data);

export const getPendingWorkspaceInvitations = () =>
  api.get("/workspaces/invitations/pending/").then((r) => r.data);

export const acceptWorkspaceInvitation = (workspaceId, invId) =>
  api.post(`/workspaces/${workspaceId}/invitations/${invId}/accept/`).then((r) => r.data);

export const declineWorkspaceInvitation = (workspaceId, invId) =>
  api.post(`/workspaces/${workspaceId}/invitations/${invId}/decline/`).then((r) => r.data);
