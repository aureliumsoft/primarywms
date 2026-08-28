"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BrandMark } from "@/components/AuthForms";
import { Button, Field, Input } from "@/components/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api("/api/v1/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[var(--shadow)]">
        <BrandMark subtitle="Reset your password" />
        {done ? (
          <p className="text-sm text-muted-foreground">If that account exists, we sent a reset link. In development it is printed in the server log.</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button className="w-full" type="submit">
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
