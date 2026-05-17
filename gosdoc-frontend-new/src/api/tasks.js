import api from "./client";

export const getTasks = (params) =>
  api.get("/tasks/", { params }).then((r) => r.data);

export const getOutgoingTasks = (params) =>
  api.get("/tasks/", { params: { ...params, direction: "outgoing" } }).then((r) => r.data);

export const getTask = (id) => api.get(`/tasks/${id}/`).then((r) => r.data);

export const completeTask = (id) =>
  api.post(`/tasks/${id}/complete/`).then((r) => r.data);

export const skipTask = (id) =>
  api.post(`/tasks/${id}/skip/`).then((r) => r.data);
