export function displayRoleName(role: { kind: string; name?: string | null }) {
  switch (role.kind) {
    case "SUPER_ADMIN":
      return "Owners";
    case "ADMIN":
      return "Admins";
    case "TEAM_MEMBER":
      return "Team Members";
    case "SCANNER":
      return "Scanner";
    default:
      return role.name?.trim() || "Custom role";
  }
}

const KIND_ORDER: Record<string, number> = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  TEAM_MEMBER: 2,
  SCANNER: 3,
  CUSTOM: 4,
};

export function sortRoles<T extends { kind: string; name: string }>(roles: T[]) {
  return [...roles].sort((a, b) => {
    const byKind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    if (byKind !== 0) return byKind;
    return displayRoleName(a).localeCompare(displayRoleName(b));
  });
}

export function roleNeedsFolderAccess(kind: string) {
  return kind !== "SUPER_ADMIN" && kind !== "ADMIN";
}
