import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">EventScribe</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Authentication will be connected to Supabase in Milestone 2. This screen establishes the frontend route.</p>
        <Link href="/dashboard" className="mt-6 block rounded-lg bg-[var(--brand)] px-4 py-3 text-center font-semibold text-white">Continue to demo dashboard</Link>
      </section>
    </main>
  );
}
