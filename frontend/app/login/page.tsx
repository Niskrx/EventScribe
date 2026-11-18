"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Supabase is not configured yet. Use the demo dashboard or add the public Supabase variables.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    setMessage(error ? error.message : "Signed in successfully. You can continue to the dashboard.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">EventScribe</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Sign in with your professor account. Supabase authentication is enabled when the public environment variables are configured.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
          </label>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white disabled:opacity-60">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]" role="status">{message}</p> : null}
        </form>
        <Link href="/dashboard" className="mt-6 block rounded-lg bg-[var(--brand)] px-4 py-3 text-center font-semibold text-white">Continue to demo dashboard</Link>
      </section>
    </main>
  );
}
