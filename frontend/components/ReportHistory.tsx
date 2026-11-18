"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { deleteReport, listReports, ReportResponse, retryReport } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function StatusBadge({ status }: { status: ReportResponse["status"] }) {
  const styles: Record<ReportResponse["status"], { badge: string; dot: string; label: string }> = {
    draft: {
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
      label: "Draft",
    },
    generating: {
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500 animate-ping",
      label: "Generating",
    },
    ready: {
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dot: "bg-emerald-500",
      label: "Ready",
    },
    failed: {
      badge: "bg-rose-50 text-rose-800 border-rose-200",
      dot: "bg-rose-500",
      label: "Failed",
    },
  };

  const current = styles[status] ?? styles.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${current.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`}></span>
      <span>{current.label}</span>
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
        description="Your generated event reports will appear here. Start by creating an event draft and providing your event facts."
        actionHref="/reports/new"
        actionLabel="Create your first report"
      />
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="interactive-card flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900">
                {report.content_json?.title ?? "Untitled Report"}
              </h3>
              <StatusBadge status={report.status} />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                {new Date(report.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>•</span>
              <span>Version {report.content_version}</span>
              {report.generation_model ? (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {report.generation_model}
                  </span>
                </>
              ) : null}
            </div>

            {report.last_error ? (
              <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{report.last_error}</span>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 text-sm">
            {report.content_json ? (
              <Link
                href={`/reports/${report.id}/edit`}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                <span>Edit & Export</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => retry(report)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => remove(report)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </article>
      ))}
      {message ? (
        <div className="rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}
