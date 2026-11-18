import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col justify-between gap-5 rounded-2xl bg-[var(--brand)] p-8 text-white md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Professor workspace</p>
            <h1 className="mt-3 text-4xl font-bold">Create your next event report.</h1>
            <p className="mt-3 max-w-xl leading-7 text-blue-100">Start with a reference format or describe the structure you want EventScribe to follow.</p>
          </div>
          <Link href="/reports/new" className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-[var(--brand)]">Create report</Link>
        </section>
        <section className="grid gap-5 md:grid-cols-3">
          {[
            ["Format profiles", "Save and reuse the report structures you prefer."],
            ["Event drafts", "Keep facts and photographs together before generation."],
            ["Report history", "Reopen, edit, and download previously generated reports."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Recent reports</h2>
          <div className="mt-4">
            <EmptyState title="No reports yet" description="Your generated reports will appear here after you complete the report workflow." />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
