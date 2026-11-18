"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Supabase is not configured yet. Add the public Supabase variables first.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);
    setMessage(
      error
        ? error.message
        : "Account created. Check your email if confirmation is required, then sign in.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">EventScribe</p>
        <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Create a professor account to save events, reports, and generated files.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Confirm password
            <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={6} required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
          </label>
          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white disabled:opacity-60">
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]" role="status">{message}</p> : null}
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--brand)]">
          Already have an account? Sign in
        </Link>
      </section>
    </main>
  );
}
