import api from "./client";

export const getAdminStats = () =>
  api.get("/admin/stats/").then((r) => r.data);

export const getAdminUsers = (params) =>
  api.get("/admin/users/", { params }).then((r) => r.data);

export const deleteAdminUser = (id) =>
  api.delete(`/admin/users/${id}/`).then((r) => r.data);

export const getAdminWorkspaces = (params) =>
  api.get("/admin/workspaces/", { params }).then((r) => r.data);

export const deleteAdminWorkspace = (id) =>
  api.delete(`/admin/workspaces/${id}/`).then((r) => r.data);
