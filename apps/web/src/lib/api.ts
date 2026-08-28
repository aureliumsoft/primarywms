import { successMessageFor, toast } from "./toast";

export type ApiInit = RequestInit & {
  /**
   * Success toast control:
   * - omit / true → auto message from route
   * - string → custom success message
   * - false → no success toast
   */
  toast?: boolean | string;
};

export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  const { toast: toastOpt, ...rest } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();

  const res = await fetch(path, {
    credentials: "include",
    ...rest,
    headers: {
      ...(rest.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(rest.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText || "Request failed");
  }

  if (toastOpt !== false) {
    const message = typeof toastOpt === "string" ? toastOpt : successMessageFor(method, path);
    if (message) toast.success(message);
  }

  return data as T;
}

export { toast };
