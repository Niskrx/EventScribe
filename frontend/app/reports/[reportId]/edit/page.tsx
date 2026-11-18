import Link from "next/link";

import { ReportEditor } from "@/components/ReportEditor";

export default async function EditReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/dashboard" className="text-sm font-semibold text-[var(--brand)]">← Back to dashboard</Link>
        <h1 className="mt-4 text-4xl font-bold">Review and edit report</h1>
        <p className="mt-3 text-[var(--muted)]">Edit the generated sections, resolve review notes, and inspect the lightweight preview before rendering.</p>
        <div className="mt-8"><ReportEditor reportId={reportId} /></div>
      </div>
    </main>
  );
}
