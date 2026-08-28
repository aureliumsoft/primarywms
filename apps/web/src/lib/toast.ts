type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

function push(kind: ToastKind, message: string) {
  const text = message.trim();
  if (!text) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, kind, message: text }].slice(-5);
  emit();
  window.setTimeout(() => dismiss(id), kind === "error" ? 5500 : 3200);
}

export function dismiss(id: string) {
  toasts = toasts.filter((row) => row.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(message: string) {
    push("success", message);
  },
  error(message: string) {
    push("error", message);
  },
  info(message: string) {
    push("info", message);
  },
};

/** Human-readable confirmation for common mutating API routes. */
export function successMessageFor(method: string, path: string): string | null {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return null;

  const clean = path.split("?")[0].replace(/\/+$/, "");

  if (clean.startsWith("/api/v1/auth/")) return null;
  if (clean === "/api/v1/barcodes" && verb === "POST") return null; // allocate / link handled by callers
  if (clean === "/api/v1/photos" && verb === "POST") return null; // often follows create
  if (clean === "/api/v1/catalog" || clean.startsWith("/api/v1/search")) return null;

  const rules: { method: string; re: RegExp; message: string }[] = [
    { method: "POST", re: /^\/api\/v1\/folders$/, message: "Folder created" },
    { method: "POST", re: /^\/api\/v1\/folders\/[^/]+\/clone$/, message: "Folder cloned" },
    { method: "DELETE", re: /^\/api\/v1\/folders\/[^/]+$/, message: "Folder moved to trash" },
    { method: "PATCH", re: /^\/api\/v1\/folders\/[^/]+$/, message: "Folder updated" },
    { method: "POST", re: /^\/api\/v1\/folders\/[^/]+\/alerts$/, message: "Alert saved" },
    { method: "PUT", re: /^\/api\/v1\/folders\/[^/]+\/permissions$/, message: "Permissions saved" },

    { method: "POST", re: /^\/api\/v1\/items$/, message: "Item created" },
    { method: "POST", re: /^\/api\/v1\/items\/[^/]+\/clone$/, message: "Item cloned" },
    { method: "POST", re: /^\/api\/v1\/items\/[^/]+\/move$/, message: "Item moved" },
    { method: "POST", re: /^\/api\/v1\/items\/[^/]+\/quantity$/, message: "Quantity updated" },
    { method: "DELETE", re: /^\/api\/v1\/items\/[^/]+$/, message: "Item moved to trash" },
    { method: "PATCH", re: /^\/api\/v1\/items\/[^/]+$/, message: "Item updated" },

    { method: "POST", re: /^\/api\/v1\/jobs$/, message: "Job created" },
    { method: "POST", re: /^\/api\/v1\/jobs\/[^/]+\/complete$/, message: "Job completed" },
    { method: "POST", re: /^\/api\/v1\/jobs\/[^/]+\/pull$/, message: "Items pulled into job" },
    { method: "PATCH", re: /^\/api\/v1\/jobs\/[^/]+$/, message: "Job updated" },
    { method: "PATCH", re: /^\/api\/v1\/settings\/jobs$/, message: "Job settings saved" },

    { method: "POST", re: /^\/api\/v1\/tags$/, message: "Tag created" },
    { method: "PATCH", re: /^\/api\/v1\/tags\/[^/]+$/, message: "Tag renamed" },
    { method: "DELETE", re: /^\/api\/v1\/tags\/[^/]+$/, message: "Tag deleted" },
    { method: "POST", re: /^\/api\/v1\/settings\/custom-fields$/, message: "Custom field created" },
    { method: "PATCH", re: /^\/api\/v1\/settings\/custom-fields\/[^/]+$/, message: "Custom field updated" },
    { method: "DELETE", re: /^\/api\/v1\/settings\/custom-fields\/[^/]+$/, message: "Custom field deleted" },
    { method: "POST", re: /^\/api\/v1\/settings\/units$/, message: "Unit created" },
    { method: "PATCH", re: /^\/api\/v1\/settings\/units\/[^/]+$/, message: "Unit updated" },
    { method: "DELETE", re: /^\/api\/v1\/settings\/units\/[^/]+$/, message: "Unit deleted" },
    { method: "POST", re: /^\/api\/v1\/settings\/reasons$/, message: "Reason created" },
    { method: "PATCH", re: /^\/api\/v1\/settings\/reasons\/[^/]+$/, message: "Reason updated" },
    { method: "DELETE", re: /^\/api\/v1\/settings\/reasons\/[^/]+$/, message: "Reason deleted" },

    { method: "POST", re: /^\/api\/v1\/items\/[^/]+\/alerts$/, message: "Alert saved" },
    { method: "POST", re: /^\/api\/v1\/items\/[^/]+\/merge$/, message: "Items merged" },
    { method: "PATCH", re: /^\/api\/v1\/users$/, message: "Team member updated" },
    { method: "PATCH", re: /^\/api\/v1\/alerts$/, message: "Alerts updated" },
    { method: "POST", re: /^\/api\/v1\/org\/logo$/, message: "Logo uploaded" },
    { method: "PATCH", re: /^\/api\/v1\/org$/, message: "Company settings saved" },
    { method: "POST", re: /^\/api\/v1\/users$/, message: "Invite sent" },
    { method: "PATCH", re: /^\/api\/v1\/users\/[^/]+$/, message: "Team member updated" },
    { method: "POST", re: /^\/api\/v1\/roles$/, message: "Role created" },
    { method: "PATCH", re: /^\/api\/v1\/roles\/[^/]+$/, message: "Role updated" },
    { method: "POST", re: /^\/api\/v1\/trash$/, message: "Restored from trash" },
    { method: "POST", re: /^\/api\/v1\/files$/, message: "File uploaded" },
    { method: "DELETE", re: /^\/api\/v1\/files$/, message: "File deleted" },
    { method: "POST", re: /^\/api\/v1\/labels$/, message: "Labels created" },
    { method: "PATCH", re: /^\/api\/v1\/notifications$/, message: "Notifications marked as read" },
    { method: "PATCH", re: /^\/api\/v1\/notifications\/[^/]+$/, message: "Notification marked as read" },
    { method: "DELETE", re: /^\/api\/v1\/barcodes$/, message: "Barcode removed" },
    { method: "POST", re: /^\/api\/v1\/photos\/[^/]+\/share$/, message: "Share link created" },
    { method: "POST", re: /^\/api\/v1\/setup$/, message: "Workspace created" },
  ];

  for (const rule of rules) {
    if (rule.method === verb && rule.re.test(clean)) return rule.message;
  }

  if (verb === "POST" || verb === "PATCH" || verb === "PUT" || verb === "DELETE") {
    if (clean.startsWith("/api/v1/")) return verb === "DELETE" ? "Deleted successfully" : "Saved successfully";
  }
  return null;
}
