"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/AuthForms";
import { Button, Field, Input } from "@/components/ui";

export default function ResetPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
        <BrandMark subtitle="Choose a new password" />
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="New password">
            <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="w-full" type="submit">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
