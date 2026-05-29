import axios from "axios";
import { config } from "@/config";
import { useAuthStore } from "@/store/authStore";

const normalizeError = (error) => {
  const status = error?.response?.status || 500;
  const data = error?.response?.data || {};
  return {
    message: data.error || data.detail || error.message || "Unexpected error",
    code: data.code || "UNKNOWN_ERROR",
    status,
  };
};

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000,
});

// Attach current access token to every outgoing request.
apiClient.interceptors.request.use((req) => {
  const { session } = useAuthStore.getState();
  if (session?.access) {
    req.headers.Authorization = `Bearer ${session.access}`;
  }
  return req;
});

// Queue of requests that arrived while a token refresh is in-flight.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (err, token = null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // Attempt a silent token refresh on the first 401.
    if (
      status === 401 && 
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/token')
    ) {
      const { session, updateAccessToken, logout } = useAuthStore.getState();

      if (!session?.refresh) {
        logout();
        return Promise.reject(normalizeError(error));
      }

      // If a refresh is already running, wait in queue.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${config.apiBaseUrl}/auth/token/refresh/`,
          { refresh: session.refresh }
        );
        const newAccess = res.data.access;
        updateAccessToken(newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(normalizeError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeError(error));
  }
);
