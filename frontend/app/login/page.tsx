"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false" || !supabase;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (demoMode) router.replace("/dashboard");
  }, [demoMode, router]);

  if (demoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <p className="text-sm font-medium text-slate-600">Opening the demo workspace…</p>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) return;
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    setMessage(error ? error.message : "Signed in successfully. Redirecting to dashboard...");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 bg-slate-50 relative overflow-hidden">
      {/* Background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-200/40 blur-[100px] rounded-full pointer-events-none -z-10" />

      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-indigo-950/5">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 text-white shadow-sm shadow-indigo-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">EventScribe</span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900">Faculty Sign In</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Sign in to access your saved formats, event drafts, and generated academic reports.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Email Address
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="professor@university.edu"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="••••••••"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign In with Supabase"}
          </button>

          {message ? (
            <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700" role="status">
              {message}
            </p>
          ) : null}
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
          <Link
            href="/dashboard"
            className="block w-full rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            Continue with Local Demo Workspace →
          </Link>

          <p className="text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
