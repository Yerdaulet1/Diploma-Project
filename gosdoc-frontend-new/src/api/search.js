import api from "./client";

export const globalSearch = (query, { limit = 20, offset = 0, type = "documents,workspaces" } = {}) =>
  api.get("/search/", { params: { q: query, limit, offset, type } }).then((r) => r.data);

export const searchDocuments = (query, params = {}) =>
  api.get("/documents/", { params: { search: query, ...params } }).then((r) => r.data);
