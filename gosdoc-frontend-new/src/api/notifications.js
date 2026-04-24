import api from "./client";

export const getNotifications = (params) =>
  api.get("/notifications/", { params }).then((r) => r.data);

export const markRead = (id) =>
  api.post(`/notifications/${id}/read/`).then((r) => r.data);

export const markAllRead = () =>
  api.post("/notifications/read-all/").then((r) => r.data);
