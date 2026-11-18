import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { ReportEditor } from "@/components/ReportEditor";

export default async function EditReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Review and Edit Report
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Refine generated academic sections, confirm any missing facts, and review the live document preview before exporting.
          </p>
        </div>

        <div className="mt-8">
          <ReportEditor reportId={reportId} />
        </div>
      </div>
    </AppShell>
  );
}
