import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Notifies the app that auth has been lost. Subscribers (e.g. router) decide
// what to do — clear stores, redirect, etc. Avoids window.location.href which
// causes a hard reload and wipes in-memory state (e.g. multi-step registration).
function emitAuthLost() {
  window.dispatchEvent(new CustomEvent("auth:lost"));
}

const PUBLIC_PATHS = [
  "/auth/register/",
  "/auth/login/",
  "/auth/verify-email/",
  "/auth/resend-code/",
  "/auth/password/reset/",
  "/auth/password/reset/confirm/",
];

// Attach access token to every non-public request
api.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.includes(p));
  if (!isPublic) {
    const token = localStorage.getItem("gosdoc_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Silent refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (original.url?.includes("/auth/refresh/")) {
        localStorage.removeItem("gosdoc_access_token");
        localStorage.removeItem("gosdoc_refresh_token");
        emitAuthLost();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          // Mark as retried so a subsequent 401 won't trigger another refresh loop
          original._retry = true;
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = localStorage.getItem("gosdoc_refresh_token");
        if (!refresh) throw new Error("No refresh token");

        const { data } = await api.post("/auth/refresh/", { refresh });
        localStorage.setItem("gosdoc_access_token", data.access);
        if (data.refresh) {
          localStorage.setItem("gosdoc_refresh_token", data.refresh);
        }
        processQueue(null, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (err) {
        processQueue(err);
        localStorage.removeItem("gosdoc_access_token");
        localStorage.removeItem("gosdoc_refresh_token");
        emitAuthLost();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
