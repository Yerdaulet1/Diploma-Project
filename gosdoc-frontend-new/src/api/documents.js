import api from "./client";

// --- Documents CRUD ---
export const getDocuments = (params) =>
  api.get("/documents/", { params }).then((r) => r.data);

export const getDocument = (id) =>
  api.get(`/documents/${id}/`).then((r) => r.data);

export const updateDocument = (id, data) =>
  api.patch(`/documents/${id}/`, data).then((r) => r.data);

export const deleteDocument = (id) =>
  api.delete(`/documents/${id}/`).then((r) => r.data);

// --- S3 Presigned Upload (2-step) ---
export const requestUpload = (data) =>
  api.post("/documents/request-upload/", data).then((r) => r.data);

export const confirmUpload = (data) =>
  api.post("/documents/", data).then((r) => r.data);

export const uploadFileToS3 = (presignedData, file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    Object.entries(presignedData.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", presignedData.url);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(formData);
  });
};

// --- Download ---
export const getDownloadUrl = (id) =>
  api.get(`/documents/${id}/download/`).then((r) => r.data);

// --- Versions ---
export const getVersions = (documentId) =>
  api.get(`/documents/${documentId}/versions/`).then((r) => r.data);

export const requestVersionUpload = (documentId) =>
  api
    .post(`/documents/${documentId}/versions/request-upload/`)
    .then((r) => r.data);

export const confirmVersionUpload = (documentId, data) =>
  api
    .post(`/documents/${documentId}/versions/confirm/`, data)
    .then((r) => r.data);

export const getVersionDiff = (documentId, versionId) =>
  api
    .get(`/documents/${documentId}/versions/${versionId}/diff/`)
    .then((r) => r.data);

// --- Workflow ---
export const startWorkflow = (documentId) =>
  api.post(`/documents/${documentId}/workflow/start/`).then((r) => r.data);

// --- Comments ---
export const getComments = (documentId) =>
  api.get(`/documents/${documentId}/comments/`).then((r) => r.data);

export const addComment = (documentId, data) =>
  api.post(`/documents/${documentId}/comments/`, data).then((r) => r.data);

export const updateComment = (commentId, data) =>
  api.patch(`/comments/${commentId}/`, data).then((r) => r.data);

export const deleteComment = (commentId) =>
  api.delete(`/comments/${commentId}/`).then((r) => r.data);

export const resolveComment = (commentId) =>
  api.post(`/comments/${commentId}/resolve/`).then((r) => r.data);

// --- Signatures ---
export const signDocument = (documentId, data) =>
  api.post(`/documents/${documentId}/sign/`, data).then((r) => r.data);

export const getSignatures = (documentId) =>
  api.get(`/documents/${documentId}/signatures/`).then((r) => r.data);

export const verifySignature = (signatureId) =>
  api.get(`/signatures/${signatureId}/verify/`).then((r) => r.data);

// --- Subtasks ---
export const getSubtasks = (docId) =>
  api.get(`/documents/${docId}/subtasks/`).then((r) => r.data);

export const createSubtask = (docId, data) =>
  api.post(`/documents/${docId}/subtasks/`, data).then((r) => r.data);

export const updateSubtask = (docId, subId, data) =>
  api.patch(`/documents/${docId}/subtasks/${subId}/`, data).then((r) => r.data);

export const deleteSubtask = (docId, subId) =>
  api.delete(`/documents/${docId}/subtasks/${subId}/`).then((r) => r.data);

// --- Attachments ---
export const getAttachments = (docId) =>
  api.get(`/documents/${docId}/attachments/`).then((r) => r.data);

export const requestAttachmentUpload = (docId, data) =>
  api.post(`/documents/${docId}/attachments/request-upload/`, data).then((r) => r.data);

export const confirmAttachmentUpload = (docId, data) =>
  api.post(`/documents/${docId}/attachments/`, data).then((r) => r.data);

export const deleteAttachment = (docId, attId) =>
  api.delete(`/documents/${docId}/attachments/${attId}/`).then((r) => r.data);

// --- Approve ---
export const approveDocument = (docId) =>
  api.post(`/documents/${docId}/approve/`).then((r) => r.data);

// --- Copy document to another workspace ---
export const copyDocument = (docId, targetWorkspaceId) =>
  api.post(`/documents/${docId}/copy/`, { workspace: targetWorkspaceId }).then((r) => r.data);

// --- Server-side upload (no CORS issues) ---
// Content-Type must NOT be set manually — browser adds boundary automatically
const multipartHeaders = { headers: { "Content-Type": undefined } };

export const serverUploadDocument = (workspaceId, title, file) => {
  const fd = new FormData();
  fd.append("workspace", workspaceId);
  fd.append("title", title);
  fd.append("file", file);
  return api.post("/documents/server-upload/", fd, multipartHeaders).then((r) => r.data);
};

// --- Blockchain verification ---
export const getBlockchain = (docId) =>
  api.get(`/documents/${docId}/blockchain/`).then((r) => r.data);

export const serverUploadAttachment = (docId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api.post(`/documents/${docId}/attachments/server-upload/`, fd, multipartHeaders).then((r) => r.data);
};

// --- Content (Phase 7/8) ---
export const getDocumentContent = (id) =>
  api.get(`/documents/${id}/content/`).then((r) => r.data);

export const saveDocumentContent = (id, data) =>
  api.put(`/documents/${id}/content/`, data).then((r) => r.data);

export const extractDocumentContent = (id) =>
  api.get(`/documents/${id}/extract/`).then((r) => r.data);
