import api from "./client";

export const getMe = () => api.get("/users/me/").then((r) => r.data);

export const updateProfile = (data) =>
  api.patch("/users/me/", data).then((r) => r.data);

export const getUsers = (params) =>
  api.get("/users/", { params }).then((r) => r.data);

export const getUser = (id) => api.get(`/users/${id}/`).then((r) => r.data);

export const changePassword = (old_password, new_password) =>
  api
    .post("/auth/password/change/", { old_password, new_password })
    .then((r) => r.data);

export const deleteAccount = () =>
  api.delete("/users/me/").then((r) => r.data);
