import { apiClient as api } from "../apiClient";
import { config } from "@/config";

// Re-export the main apiClient so that services importing from `core/apiClient` 
// will correctly use the interceptors (and JWT tokens) attached to the main client.
export { config, api };
