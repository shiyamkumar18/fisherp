import axios from "axios";

// Simple API client used by frontend services.
// The previous file contained merge-corruption / stray blocks that broke Vite parsing.

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || "/api",
};

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
});

// Compatibility: many services import { api } from core/apiClient.
export const api = apiClient;


