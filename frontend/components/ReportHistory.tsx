"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteReport, listReports, ReportResponse, retryReport } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function StatusBadge({ status }: { status: ReportResponse["status"] }) {
  const styles: Record<ReportResponse["status"], string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    generating: "bg-amber-50 text-amber-800 border-amber-200 animate-pulse",
    ready: "bg-green-50 text-green-800 border-green-200",
    failed: "bg-red-50 text-red-800 border-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${styles[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export function ReportHistory() {
  const [reports, setReports] = useState<ReportResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    try {
      setReports(await listReports());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Report history could not be loaded.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function remove(report: ReportResponse) {
    if (!window.confirm("Delete this report and its generated files?")) return;
    try {
      await deleteReport(report.id);
      setMessage("Report deleted.");
      await refresh();
    } catch (deleteError: unknown) {
      setMessage(deleteError instanceof Error ? deleteError.message : "The report could not be deleted.");
    }
  }

  async function retry(report: ReportResponse) {
    try {
      await retryReport(report.id);
      setMessage("Report generation completed.");
      await refresh();
    } catch (retryError: unknown) {
      setMessage(retryError instanceof Error ? retryError.message : "The report could not be retried.");
      await refresh();
    }
  }

  if (error) return <ErrorState description={error} />;
  if (!reports) return <LoadingState label="Loading report history" />;
  if (!reports.length) {
    return (
      <EmptyState
        title="No reports generated yet"
        description="Your generated event reports will appear here. Start by creating an event draft and selecting a format profile."
        actionHref="/reports/new"
        actionLabel="Create your first report"
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <article key={report.id} className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{report.content_json?.title ?? "Untitled report"}</h3>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">Version {report.content_version} · Created {new Date(report.created_at).toLocaleDateString()}</p>
            {report.last_error ? <p className="mt-1 text-sm text-red-700">{report.last_error}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {report.content_json ? <Link href={`/reports/${report.id}/edit`} className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-slate-50">Edit</Link> : null}
            <button type="button" onClick={() => retry(report)} className="rounded-lg border border-[var(--border)] px-3 py-2 font-semibold hover:bg-slate-50">Retry</button>
            <button type="button" onClick={() => remove(report)} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50">Delete</button>
          </div>
        </article>
      ))}
      {message ? <p className="text-sm text-[var(--muted)]" role="status">{message}</p> : null}
    </div>
  );
}
