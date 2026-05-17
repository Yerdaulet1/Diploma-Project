import api from "./client";

export const getReports = (params) =>
  api.get("/reports/", { params }).then((r) => r.data);

export const generateReport = (data) =>
  api.post("/reports/generate/", data).then((r) => r.data);

export const getReport = (id) =>
  api.get(`/reports/${id}/`).then((r) => r.data);

export const exportReport = (id, fileFormat) =>
  api
    .get(`/reports/${id}/export/`, {
      params: { file_format: fileFormat },
      responseType: "blob",
    })
    .then((r) => r.data);

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};
