import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NewReportPage() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <Link href="/dashboard" className="text-sm font-semibold text-[var(--brand)]">← Back to dashboard</Link>
        <h1 className="mt-4 text-4xl font-bold">Create a report</h1>
        <p className="mt-3 text-[var(--muted)]">The format upload, event form, and photograph workflow will be implemented in the next milestones.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["1", "Choose a format", "Upload a PDF/DOCX reference or describe your format."],
            ["2", "Add event facts", "Provide the verified details the report should contain."],
            ["3", "Review and export", "Edit the draft and download DOCX/PDF files."],
          ].map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-bold text-[var(--brand)]">{number}</span>
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
