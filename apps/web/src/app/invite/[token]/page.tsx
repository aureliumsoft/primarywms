"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/AuthForms";
import { Button, Field, Input } from "@/components/ui";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{ email: string; firstName?: string; lastName?: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ email: string; firstName?: string; lastName?: string }>(`/api/v1/invites/accept?token=${token}`)
      .then((d) => {
        setInfo(d);
        setForm((f) => ({ ...f, firstName: d.firstName || "", lastName: d.lastName || "" }));
      })
      .catch((e) => setError(e.message));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token, ...form }),
      });
      router.push("/items");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
        <BrandMark subtitle={info ? `Join as ${info.email}` : "Accept your invite"} />
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="First name">
            <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="w-full" type="submit">
            Join Primary WMS
          </Button>
        </form>
      </div>
    </div>
  );
}
