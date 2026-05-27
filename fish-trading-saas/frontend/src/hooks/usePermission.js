import { PERMISSIONS } from "../utils/permissions";

export function usePermission(role) {
  const canAccess = (feature) => {
    return PERMISSIONS[feature]?.includes(role);
  };
  return { canAccess };
}
