import axios from "axios";

// Shared axios instance for frontend feature services.
// Keep this file minimal and syntactically valid for Vite builds.

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || "/api",
};

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
});

