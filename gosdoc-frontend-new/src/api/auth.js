import api from "./client";

export const login = (email, password) =>
  api.post("/auth/login/", { email, password }).then((r) => r.data);

export const register = (data) =>
  api.post("/auth/register/", data).then((r) => r.data);

export const verifyEmail = (email, code) =>
  api.post("/auth/verify-email/", { email, code }).then((r) => r.data);

export const resendCode = (email, purpose = "registration") =>
  api.post("/auth/resend-code/", { email, purpose }).then((r) => r.data);

export const logout = (refresh) =>
  api.post("/auth/logout/", { refresh }).then((r) => r.data);

export const resetPasswordRequest = (email) =>
  api.post("/auth/password/reset/", { email }).then((r) => r.data);

export const resetPasswordConfirm = (email, code, new_password) =>
  api
    .post("/auth/password/reset/confirm/", { email, code, new_password })
    .then((r) => r.data);

