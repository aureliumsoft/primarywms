"use client";

import { FormEvent, useEffect, useState } from "react";
import { PERMISSIONS } from "@primarywms/shared";
import { api, toast } from "@/lib/api";
import { canManageTeam } from "@/lib/permissions";
import { AccessDenied, SettingsCard, SettingsPage, SettingsSave, SettingsTable, SettingsTh, settingsInputClass } from "@/components/settings/ui";
import { Button, Field, Input, Modal } from "@/components/ui";
import { displayRoleName, roleNeedsFolderAccess, sortRoles } from "@/lib/roles";

type Role = { id: string; name: string; kind: string; hidePrices?: boolean; permissions?: Record<string, boolean> };
type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: Role;
  inviteUrl?: string;
  folderAcls?: { grant: string; folder: { id: string; name: string } }[];
};

const PERM_LABELS: Record<string, string> = {
  view_item: "View items",
  add_item: "Add items",
  edit_item: "Edit items",
  delete_item: "Delete items",
  update_quantity: "Update quantity",
  move_item: "Move items",
  clone_item: "Clone items",
  merge_item: "Merge items",
  create_label: "Create labels",
  link_barcode: "Link barcodes",
  set_alerts: "Set alerts",
  add_folder: "Add folders",
  edit_folder: "Edit folders",
  bulk_edit: "Bulk edit",
  import: "Import",
  export: "Export",
  reports: "Reports",
  manage_users: "Manage team",
  company_settings: "Company settings",
  manage_catalog_settings: "Catalog settings",
  see_prices: "See prices",
};

export default function TeamPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tree, setTree] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", roleId: "", folderId: "", grant: "EDIT" });
  const [inviteLink, setInviteLink] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleError, setRoleError] = useState("");
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [userFolders, setUserFolders] = useState<{ folderId: string; grant: string }[]>([]);
  const [userStatus, setUserStatus] = useState("ACTIVE");
  const [userRoleId, setUserRoleId] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [hidePrices, setHidePrices] = useState(false);

  const [role, setRole] = useState<{ kind: string; permissions: Record<string, boolean> } | null>(null);
  const [inviteError, setInviteError] = useState("");

  function load() {
    api<{ users: UserRow[]; roles: Role[] }>("/api/v1/users")
      .then((d) => {
        setUsers(d.users);
        setRoles(d.roles);
        if (!form.roleId && d.roles[0]) setForm((f) => ({ ...f, roleId: d.roles.find((r) => r.kind === "TEAM_MEMBER")?.id || d.roles[0].id }));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load team"));
    api<{ tree: { id: string; name: string }[] }>("/api/v1/folders").then((d) => setTree(d.tree));
  }
  useEffect(() => {
    api<{ user: { role: { kind: string; permissions: Record<string, boolean> } } }>("/api/v1/auth/me")
      .then((d) => setRole(d.user.role))
      .catch(() => setRole({ kind: "", permissions: {} }));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInviteError("");
    const selectedRole = roles.find((r) => r.id === form.roleId);
    if (selectedRole && roleNeedsFolderAccess(selectedRole.kind) && !form.folderId) {
      setInviteError("Choose a folder for this role");
      return;
    }
    try {
      const role = selectedRole;
      const payload: Record<string, unknown> = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        roleId: form.roleId,
      };
      if (role && role.kind !== "SUPER_ADMIN" && role.kind !== "ADMIN") {
        payload.folders = form.folderId ? [{ folderId: form.folderId, grant: form.grant }] : [];
      }
      const res = await api<{ user: { inviteUrl: string } }>("/api/v1/users", { method: "POST", body: JSON.stringify(payload) });
      setInviteLink(res.user.inviteUrl);
      setForm({ ...form, email: "", firstName: "", lastName: "" });
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not send invite");
    }
  }

  async function onCreateRole(e: FormEvent) {
    e.preventDefault();
    setRoleError("");
    try {
      await api("/api/v1/roles", { method: "POST", body: JSON.stringify({ name: roleName }) });
      setRoleName("");
      load();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Could not create role");
    }
  }

  function openUser(u: UserRow) {
    setEditUser(u);
    setUserStatus(u.status === "PENDING" ? "PENDING" : u.status);
    setUserRoleId(u.role.id);
    setUserFolders(u.folderAcls?.map((a) => ({ folderId: a.folder.id, grant: a.grant })) ?? []);
  }

  function openRole(role: Role) {
    setEditRole(role);
    setHidePrices(Boolean(role.hidePrices));
    const next: Record<string, boolean> = {};
    for (const key of PERMISSIONS) next[key] = Boolean(role.permissions?.[key]);
    setPerms(next);
  }

  const customRoles = roles.filter((role) => role.kind === "CUSTOM");
  const inviteRoles = sortRoles(roles);
  const selectedRole = roles.find((role) => role.id === form.roleId);
  const needsFolders = selectedRole ? roleNeedsFolderAccess(selectedRole.kind) : true;

  if (role === null) {
    return (
      <SettingsPage title="Manage Team">
        <p className="text-[14px] text-[#8a9a93]">Loading…</p>
      </SettingsPage>
    );
  }

  if (!canManageTeam(role)) {
    return <AccessDenied message="Only users with team management access can view this page." />;
  }

  return (
    <SettingsPage title="Manage Team" wide>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <SettingsTable>
          <thead className="border-b border-[#e6ebe8] bg-[#fafbfa]">
            <tr>
              <SettingsTh>Name</SettingsTh>
              <SettingsTh>Email</SettingsTh>
              <SettingsTh>Role</SettingsTh>
              <SettingsTh>Status</SettingsTh>
              <SettingsTh />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#eef2f0]">
                <td className="px-4 py-2">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{displayRoleName(u.role)}</td>
                <td className="px-4 py-2">{u.status}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => openUser(u)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </SettingsTable>
        <div className="space-y-6">
          <form onSubmit={onSubmit}>
            <SettingsCard title="Invite user">
              <div className="space-y-3">
                <Field label="Email">
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="First name">
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </Field>
                <Field label="Last name">
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </Field>
                <Field label="Role">
                  <select className={settingsInputClass()} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                    {inviteRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {displayRoleName(r)}
                      </option>
                    ))}
                  </select>
                </Field>
                {needsFolders ? (
                  <>
                    <Field label="Folder access">
                      <select className={settingsInputClass()} value={form.folderId} onChange={(e) => setForm({ ...form, folderId: e.target.value })}>
                        <option value="">Choose folder</option>
                        {tree.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Grant">
                      <select className={settingsInputClass()} value={form.grant} onChange={(e) => setForm({ ...form, grant: e.target.value })}>
                        <option value="EDIT">View and Edit</option>
                        <option value="VIEW">View only</option>
                      </select>
                    </Field>
                  </>
                ) : (
                  <p className="text-[13px] text-[#6b7c74]">Owners and Admins can see every folder.</p>
                )}
                <SettingsSave>Send invite</SettingsSave>
                {inviteError ? <p className="text-[13px] text-danger">{inviteError}</p> : null}
                {inviteLink ? (
                  <p className="break-all text-[12px] text-[#8a9a93]">
                    Invite link (dev): {typeof window !== "undefined" ? window.location.origin : ""}
                    {inviteLink}
                  </p>
                ) : null}
              </div>
            </SettingsCard>
          </form>
          <form onSubmit={onCreateRole}>
            <SettingsCard title="Custom roles">
              <p className="mb-4 text-[13px] text-[#6b7c74]">
                Custom roles appear in alert recipients. Invite people to them like any other role.
              </p>
              {customRoles.length ? (
                <ul className="mb-4 text-[14px]">
                  {customRoles.map((role) => (
                    <li key={role.id} className="flex items-center justify-between border-t border-[#eef2f0] py-2.5 first:border-t-0">
                      {role.name}
                      <button type="button" className="text-[13px] font-medium text-primary hover:underline" onClick={() => openRole(role)}>
                        Permissions
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-4 text-[13px] text-[#8a9a93]">No custom roles yet.</p>
              )}
              <Field label="Role name">
                <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Warehouse lead" required />
              </Field>
              {roleError ? <p className="mt-2 text-[13px] text-danger">{roleError}</p> : null}
              <SettingsSave>Add custom role</SettingsSave>
            </SettingsCard>
          </form>
        </div>
      </div>

      {editUser ? (
        <Modal open title={`${editUser.firstName} ${editUser.lastName}`.trim() || editUser.email} onClose={() => setEditUser(null)}>
          <Field label="Role">
            <select className="h-11 w-full rounded-lg border px-3" value={userRoleId} onChange={(e) => setUserRoleId(e.target.value)}>
              {inviteRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {displayRoleName(r)}
                </option>
              ))}
            </select>
          </Field>
          {editUser.status !== "PENDING" ? (
            <Field label="Status">
              <select className="h-11 w-full rounded-lg border px-3" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>
            </Field>
          ) : null}
          {roleNeedsFolderAccess(roles.find((r) => r.id === userRoleId)?.kind ?? editUser.role.kind) ? (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium">Folder access</p>
              {userFolders.map((row, i) => (
                <div key={`${row.folderId}-${i}`} className="mb-2 flex gap-2">
                  <select
                    className="h-10 flex-1 rounded-lg border px-2 text-sm"
                    value={row.folderId}
                    onChange={(e) =>
                      setUserFolders((rows) => rows.map((r, idx) => (idx === i ? { ...r, folderId: e.target.value } : r)))
                    }
                  >
                    {tree.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 w-36 rounded-lg border px-2 text-sm"
                    value={row.grant}
                    onChange={(e) =>
                      setUserFolders((rows) => rows.map((r, idx) => (idx === i ? { ...r, grant: e.target.value } : r)))
                    }
                  >
                    <option value="EDIT">View and Edit</option>
                    <option value="VIEW">View only</option>
                  </select>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setUserFolders((rows) => [...rows, { folderId: tree[0]?.id ?? "", grant: "EDIT" }])}
              >
                Add folder
              </button>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {editUser.status === "PENDING" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const res = await api<{ inviteUrl?: string }>("/api/v1/users", {
                        method: "PATCH",
                        body: JSON.stringify({ userId: editUser.id, resend: true }),
                      });
                      if (res.inviteUrl) setInviteLink(res.inviteUrl);
                      toast.success("Invite resent");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not resend invite");
                    }
                  }}
                >
                  Resend invite
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!confirm("Revoke this invite?")) return;
                    try {
                      await api("/api/v1/users", { method: "PATCH", body: JSON.stringify({ userId: editUser.id, revoke: true }) });
                      setEditUser(null);
                      load();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not revoke invite");
                    }
                  }}
                >
                  Revoke
                </Button>
              </>
            ) : null}
            <Button
              onClick={async () => {
                try {
                  await api("/api/v1/users", {
                    method: "PATCH",
                    body: JSON.stringify({
                      userId: editUser.id,
                      roleId: userRoleId,
                      status: userStatus === "PENDING" ? undefined : userStatus,
                      ...(roleNeedsFolderAccess(roles.find((r) => r.id === userRoleId)?.kind ?? editUser.role.kind)
                        ? { folders: userFolders.filter((r) => r.folderId).map((r) => ({ folderId: r.folderId, grant: r.grant })) }
                        : {}),
                    }),
                  });
                  setEditUser(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save user");
                }
              }}
            >
              Save
            </Button>
          </div>
        </Modal>
      ) : null}

      {editRole ? (
        <Modal open title={`Permissions · ${editRole.name}`} onClose={() => setEditRole(null)} wide>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hidePrices} onChange={(e) => setHidePrices(e.target.checked)} />
            Hide prices
          </label>
          <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto text-sm">
            {PERMISSIONS.map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(perms[key])}
                  onChange={(e) => setPerms((p) => ({ ...p, [key]: e.target.checked }))}
                />
                {PERM_LABELS[key] ?? key}
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditRole(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await api(`/api/v1/roles/${editRole.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ hidePrices, permissions: perms }),
                  });
                  setEditRole(null);
                  load();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not save permissions");
                }
              }}
            >
              Save permissions
            </Button>
          </div>
        </Modal>
      ) : null}
    </SettingsPage>
  );
}
