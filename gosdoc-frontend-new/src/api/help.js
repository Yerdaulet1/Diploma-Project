import api from "./client";

export const getFaqs = (topic) =>
  api.get("/help/faqs/", { params: topic ? { topic } : {} }).then((r) => r.data);

export const sendHelpChat = (message) =>
  api.post("/ai/chat/help/", { message }).then((r) => r.data);
