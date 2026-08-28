"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME, DEFAULT_ACCENT } from "@primarywms/shared";
import { api } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

export function BrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md"
        style={{ background: DEFAULT_ACCENT }}
      >
        PW
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/items");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in";
      if (message.toLowerCase().includes("setup")) router.push("/setup");
      else setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="text-center">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password
        </Link>
      </div>
    </form>
  );
}

export function SetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "Primary WMS",
    initials: "PW",
    accentColor: DEFAULT_ACCENT,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/v1/setup", { method: "POST", body: JSON.stringify(form) });
      router.push("/items");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setPending(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Company name">
        <Input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Initials">
          <Input required maxLength={4} value={form.initials} onChange={(e) => set("initials", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Accent color">
          <div className="flex gap-2">
            <input
              type="color"
              className="h-11 w-14 cursor-pointer rounded-lg border border-border"
              value={form.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
            />
            <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
      </div>
      <Field label="Email">
        <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Password">
        <Input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creating…" : "Create Super Admin"}
      </Button>
    </form>
  );
}
