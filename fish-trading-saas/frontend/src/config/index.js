const toBool = (value) => String(value).toLowerCase() === "true";

export const config = {
  appName: "Fish Trading SaaS",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  useMocks: toBool(import.meta.env.VITE_USE_MOCKS || "false"),
  enableDebugLogs: toBool(import.meta.env.VITE_DEBUG_LOGS || "false"),
};
