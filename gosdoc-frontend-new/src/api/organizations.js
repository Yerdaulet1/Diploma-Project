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

export const inviteToOrg = (id, email) =>
  api.post(`/organizations/${id}/invite/`, { email }).then((r) => r.data);
