/**
 * PermissionContext
 *
 * Placeholder permission system for AR view (and future features).
 *
 * Roles:
 *   "user"    – standard authenticated user
 *   "manager" – elevated role with additional actions
 *
 * Permissions:
 *   "inspect" – available to all roles
 *   "create"  – available to managers only
 *
 * TODO: Replace the hardcoded `currentRole` with real authentication/
 *       session data once the login system is implemented (not my job so enjoy -oli)
 */

import { createContext, useContext } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "user" | "manager" | "admin";

export type Permission = "inspect" | "create";

// Map each permission to the minimum role required to use it.
const ROLE_PERMISSIONS: Record<Permission, UserRole[]> = {
  inspect: ["user", "manager", "admin"],
  create:  ["manager", "admin"],
};

// ── Context ───────────────────────────────────────────────────────────────────

interface PermissionContextType {
  /** The current user's role. */
  role: UserRole;
  /**
   * Returns true when the current user's role is allowed to perform
   * the requested action.
   *
   * @param permission – one of the defined {@link Permission} keys
   */
  hasPermission: (permission: Permission) => boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  role: "user",
  hasPermission: () => false,
});

// ── Provider ──────────────────────────────────────────────────────────────────

interface PermissionProviderProps {
  /**
   * The role to assign to the current session.
   *
   */
  role: UserRole;
  children: React.ReactNode;
}

export const PermissionProvider = ({ role, children }: PermissionProviderProps) => {
  const hasPermission = (permission: Permission): boolean =>
    ROLE_PERMISSIONS[permission].includes(role);

  return (
    <PermissionContext.Provider value={{ role, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const usePermission = () => useContext(PermissionContext);