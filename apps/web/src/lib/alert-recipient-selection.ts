import type { AlertRecipientKind } from "@primarywms/db";
import { displayRoleName } from "./roles";

export type AlertRecipientDraft = {
  self: boolean;
  customRoles: boolean;
  owners: boolean;
  admins: boolean;
  teamMembers: boolean;
  scanners: boolean;
  customRoleIds: string[];
  peopleIds: string[];
};

const SELF = "self";
const KIND_CUSTOM = "kind:CUSTOM";
const KIND_SUPER = "kind:SUPER_ADMIN";
const KIND_ADMIN = "kind:ADMIN";
const KIND_TEAM = "kind:TEAM_MEMBER";
const KIND_SCANNER = "kind:SCANNER";

export function encodeAlertRecipients(draft: AlertRecipientDraft): {
  recipientKind: AlertRecipientKind;
  recipientIds: string[];
} {
  const ids: string[] = [];
  if (draft.self) ids.push(SELF);
  if (draft.owners) ids.push(KIND_SUPER);
  if (draft.admins) ids.push(KIND_ADMIN);
  if (draft.teamMembers) ids.push(KIND_TEAM);
  if (draft.scanners) ids.push(KIND_SCANNER);
  if (draft.customRoleIds.length) {
    for (const id of draft.customRoleIds) ids.push(`role:${id}`);
  } else if (draft.customRoles) {
    ids.push(KIND_CUSTOM);
  }
  for (const id of draft.peopleIds) ids.push(`user:${id}`);

  return { recipientKind: primaryKind(draft), recipientIds: ids };
}

function primaryKind(draft: AlertRecipientDraft): AlertRecipientKind {
  const groups = [
    draft.self,
    draft.customRoles,
    draft.owners,
    draft.admins,
    draft.teamMembers,
    draft.scanners,
    draft.peopleIds.length > 0,
  ].filter(Boolean).length;
  if (draft.peopleIds.length || groups > 1) return "PEOPLE";
  if (draft.customRoles) return "CUSTOM_ROLES";
  if (draft.teamMembers) return "TEAM_MEMBERS";
  if (draft.admins) return "ADMINS";
  if (draft.owners) return "SUPER_ADMINS";
  if (draft.scanners) return "TEAM_MEMBERS";
  return "SELF";
}

export function isRecipientToken(value: string) {
  return (
    value === SELF ||
    value.startsWith("kind:") ||
    value.startsWith("role:") ||
    value.startsWith("user:")
  );
}

export function parseRecipientTokens(ids: string[]) {
  const kinds = new Set<string>();
  const roleIds: string[] = [];
  const userIds: string[] = [];
  let self = false;
  for (const raw of ids) {
    if (raw === SELF) self = true;
    else if (raw.startsWith("kind:")) kinds.add(raw.slice(5));
    else if (raw.startsWith("role:")) roleIds.push(raw.slice(5));
    else if (raw.startsWith("user:")) userIds.push(raw.slice(5));
  }
  return { self, kinds, roleIds, userIds };
}

export function alertRoleCheckboxLabel(role: { kind: string; name: string }) {
  return displayRoleName(role);
}
