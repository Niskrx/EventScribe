import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Academic reporting, simplified</p>
        <h1 className="text-5xl font-bold tracking-tight text-[var(--foreground)]">Create polished event reports from your facts and format.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">EventScribe understands a reference report, drafts fact-grounded content, and prepares an editable report for review.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/dashboard" className="rounded-lg bg-[var(--brand)] px-5 py-3 font-semibold text-white shadow-sm hover:opacity-90">Open dashboard</Link>
          <Link href="/login" className="rounded-lg border border-[var(--border)] bg-white px-5 py-3 font-semibold text-[var(--foreground)] hover:border-[var(--brand)]">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
