type RoleLike = { kind: string; permissions?: Record<string, boolean> };

/** Client-side mirror of `can()` in auth.ts (except delete_org). */
export function clientCan(role: RoleLike, permission: string) {
  if (role.kind === "SUPER_ADMIN") return true;
  if (role.kind === "ADMIN") return true;
  return Boolean(role.permissions?.[permission]);
}

export function canManageCompany(role: RoleLike) {
  return clientCan(role, "company_settings");
}

export function canManageTeam(role: RoleLike) {
  return clientCan(role, "manage_users");
}

export function canManageCatalog(role: RoleLike) {
  return clientCan(role, "manage_catalog_settings");
}
