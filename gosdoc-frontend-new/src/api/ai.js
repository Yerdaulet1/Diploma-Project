import api from "./client";

export const generateDocument = (description, doc_type) =>
  api.post("/ai/generate/", { description, doc_type }).then((r) => r.data);

export const summarizeDocument = (document_id) =>
  api.post("/ai/summarize/", { document_id }).then((r) => r.data);

export const searchDocuments = (query, workspace_id, top_k = 5) =>
  api.post("/ai/search/", { query, workspace_id, top_k }).then((r) => r.data);

export const embedDocument = (document_id) =>
  api.post("/ai/embed/", { document_id }).then((r) => r.data);

export const classifyDocument = (document_id) =>
  api.post("/ai/classify/", { document_id }).then((r) => r.data);

export const chatWithDocument = (document_id, message) =>
  api.post("/ai/chat/document/", { document_id, message }).then((r) => r.data);

export const generalChat = (message, workspace_id) =>
  api.post("/ai/chat/general/", { message, workspace_id }).then((r) => r.data);

export const getChatHistory = (params) =>
  api.get("/ai/chat/history/", { params }).then((r) => r.data);
