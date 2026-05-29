/**
 * ============================================================
 * HOW TO RUN THE APPLICATION
 * ============================================================
 *
 * --- Option 1: Docker Compose (Recommended) ---
 *   cd /workspaces/fisherp
 *   docker compose up -d --build        # Start all services
 *   docker compose ps                   # Check status
 *   docker compose logs -f web          # View Django logs
 *   docker compose down                 # Stop all services
 *
 * --- Option 2: Manual Backend ---
 *   cd /workspaces/fisherp/fish-trading-saas/backend
 *   export DJANGO_SETTINGS_MODULE=config.settings
 *   export DB_NAME=fisherp_dev DB_USER=fisherp_user DB_PASSWORD=fisherp_pass
 *   export DB_HOST=localhost DB_PORT=5432
 *   export REDIS_URL=redis://localhost:6379/0
 *   export SECRET_KEY="dev-only-insecure-key-change-in-production"
 *   export DEBUG=True ALLOWED_HOSTS="localhost,127.0.0.1"
 *   pip install -r requirements.txt
 *   python manage.py migrate
 *   python manage.py runserver 0.0.0.0:8000
 *
 * --- Frontend Dev Server ---
 *   cd /workspaces/fisherp/fish-trading-saas/frontend
 *   npm install                         # First time only
 *   npx vite --host 0.0.0.0 --port 5173
 *
 * --- URLs ---
 *   Backend API:  http://localhost:8000
 *   Frontend:     http://localhost:5173
 * ============================================================
 */

import { apiClient } from "@/services/apiClient";

export const loginUser = async ({ email, password, company_name }) => {
  const body = { identifier: email, password };
  
  // The new endpoint /auth/login/ maps to MultiIdentifierLoginView
  // 'email' parameter acts as the universal identifier.
  const response = await apiClient.post("/auth/login/", body);
  const data = response.data;

  return {
    access: data.access,
    refresh: data.refresh,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      username: data.user?.username,
      role: data.user?.role || "customer",
      company_name: data.user?.company?.name || null,
      tenant_slug: data.user?.company?.slug || null,
    },
  };
};

export const logoutUser = async () => {
  try {
    await apiClient.post("/auth/logout/");
  } catch {
    // Ignore logout API failures and clear local session regardless.
  }
};
