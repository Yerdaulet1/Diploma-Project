import api from "./client";

export const getMe = () => api.get("/users/me/").then((r) => r.data);

export const updateProfile = (data) =>
  api.patch("/users/me/", data).then((r) => r.data);

export const getUsers = (params) =>
  api.get("/users/", { params }).then((r) => r.data);

export const getUser = (id) => api.get(`/users/${id}/`).then((r) => r.data);

export const changePassword = (old_password, new_password) =>
  api.post("/auth/password/change/", { old_password, new_password }).then((r) => r.data);

export const deleteAccount = () =>
  api.delete("/users/me/").then((r) => r.data);

// Avatar (Phase 11/12)
export const requestAvatarUpload = (data) =>
  api.post("/users/me/avatar/request-upload/", data).then((r) => r.data);

export const confirmAvatarUpload = (data) =>
  api.post("/users/me/avatar/confirm/", data).then((r) => r.data);

export const serverUploadAvatar = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post("/users/me/avatar/upload/", fd, {
    headers: { "Content-Type": undefined },
  }).then((r) => r.data);
};

// Settings (Phase 11/12)
export const getSettings = () =>
  api.get("/users/me/settings/").then((r) => r.data);

export const updateSettings = (data) =>
  api.patch("/users/me/settings/", data).then((r) => r.data);

// Change-email OTP (Phase 11/12)
export const requestEmailChange = (new_email) =>
  api.post("/users/me/change-email/request/", { new_email }).then((r) => r.data);

export const confirmEmailChange = (new_email, code) =>
  api.post("/users/me/change-email/confirm/", { new_email, code }).then((r) => r.data);
