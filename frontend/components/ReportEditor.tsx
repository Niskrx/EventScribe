"use client";

import { useEffect, useState } from "react";

import { getReport, ReportContent, ReportResponse, updateReportContent } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export function ReportEditor({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [content, setContent] = useState<ReportContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getReport(reportId)
      .then((loaded) => {
        setReport(loaded);
        setContent(loaded.content_json);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "The report could not be loaded."));
  }, [reportId]);

  if (error) return <ErrorState description={error} />;
  if (!report || !content) return <LoadingState label="Loading report" />;

  function updateSectionText(sectionIndex: number, blockIndex: number, text: string) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return {
          ...section,
          blocks: section.blocks.map((block, currentBlockIndex) => currentBlockIndex === blockIndex ? { ...block, text } : block),
        };
      });
      return { ...current, sections };
    });
  }

  async function save() {
    if (!content) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await updateReportContent(reportId, content);
      setReport(saved);
      setContent(saved.content_json);
      setMessage(`Saved version ${saved.content_version}.`);
    } catch (saveError: unknown) {
      setMessage(saveError instanceof Error ? saveError.message : "The report could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium">
            Report title
            <input value={content.title} onChange={(event) => setContent({ ...content, title: event.target.value })} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xl font-semibold" />
          </label>
          {content.missing_facts.length ? <WarningList title="Facts to confirm" items={content.missing_facts} /> : null}
        </div>
        {content.sections.map((section, sectionIndex) => (
          <section key={section.key} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.needs_review ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Review</span> : null}
            </div>
            {section.review_notes.length ? <WarningList title="Section notes" items={section.review_notes} /> : null}
            <div className="mt-4 space-y-3">
              {section.blocks.map((block, blockIndex) => (
                <textarea key={`${section.key}-${blockIndex}`} value={block.text} onChange={(event) => updateSectionText(sectionIndex, blockIndex, event.target.value)} rows={4} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm leading-6" aria-label={`${section.title} block ${blockIndex + 1}`} />
              ))}
            </div>
          </section>
        ))}
        <button type="button" onClick={save} disabled={isSaving} className="rounded-lg bg-[var(--brand)] px-5 py-3 font-semibold text-white disabled:opacity-60">
          {isSaving ? "Saving…" : "Save edits"}
        </button>
        {message ? <p className="text-sm text-[var(--muted)]" role="status">{message}</p> : null}
      </section>
      <Preview content={content} status={report.status} />
    </div>
  );
}

function WarningList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function Preview({ content, status }: { content: ReportContent; status: ReportResponse["status"] }) {
  return (
    <article className="h-fit rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Preview · {status}</p>
        <span className="text-xs text-[var(--muted)]">Draft view</span>
      </div>
      <h1 className="mt-8 text-center text-3xl font-bold">{content.title}</h1>
      <div className="mt-8 space-y-7">
        {content.sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-7 text-slate-700">
              {section.blocks.map((block, index) => <p key={`${section.key}-preview-${index}`}>{block.text || "[Empty block]"}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
