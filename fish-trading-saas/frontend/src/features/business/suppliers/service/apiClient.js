import axios from "axios";

// Central axios instance for this feature.
// In production, the app runs behind Django/Nginx at the same origin.
export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

