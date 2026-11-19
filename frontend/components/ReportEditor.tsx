"use client";

import { useEffect, useState } from "react";

import {
  convertReportPdf,
  downloadReportFile,
  getReport,
  renderReport,
  ReportContent,
  ReportResponse,
  updateReportContent,
} from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export function ReportEditor({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [content, setContent] = useState<ReportContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getReport(reportId)
      .then((loaded) => {
        setReport(loaded);
        setContent(loaded.content_json);
      })
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "The report could not be loaded."),
      );
  }, [reportId]);

  if (error) return <ErrorState description={error} />;
  if (!report || !content) return <LoadingState label="Loading report editor" />;

  function updateSectionText(sectionIndex: number, blockIndex: number, text: string) {
    setContent((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return {
          ...section,
          blocks: section.blocks.map((block, currentBlockIndex) =>
            currentBlockIndex === blockIndex ? { ...block, text } : block,
          ),
        };
      });
      return { ...current, sections };
    });
  }

  async function save(): Promise<ReportResponse | null> {
    if (!content) return null;
    setIsSaving(true);
    setMessage(null);
    try {
      const saved = await updateReportContent(reportId, content);
      setReport(saved);
      setContent(saved.content_json);
      setMessage(`Changes saved successfully (Version ${saved.content_version}).`);
      return saved;
    } catch (saveError: unknown) {
      setMessage(saveError instanceof Error ? saveError.message : "The report could not be saved.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function prepareDocx() {
    if (isExporting) return;
    setIsExporting(true);
    setMessage("Saving edits and rendering the DOCX…");
    try {
      const saved = await save();
      if (!saved) return;
      const rendered = await renderReport(reportId);
      setReport(rendered);
      setMessage("DOCX is ready. You can download it or convert it to PDF.");
    } catch (renderError: unknown) {
      setMessage(renderError instanceof Error ? renderError.message : "The DOCX could not be rendered.");
    } finally {
      setIsExporting(false);
    }
  }

  async function preparePdf() {
    if (isExporting) return;
    setIsExporting(true);
    setMessage("Converting the rendered DOCX to PDF…");
    try {
      const converted = await convertReportPdf(reportId);
      setReport(converted);
      setMessage("PDF is ready to download.");
    } catch (convertError: unknown) {
      setMessage(convertError instanceof Error ? convertError.message : "The PDF could not be created.");
    } finally {
      setIsExporting(false);
    }
  }

  async function download(fileType: "docx" | "pdf") {
    if (isExporting) return;
    setIsExporting(true);
    setMessage(`Preparing ${fileType.toUpperCase()} download…`);
    try {
      const blob = await downloadReportFile(reportId, fileType);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `event-report.${fileType}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`${fileType.toUpperCase()} downloaded successfully.`);
    } catch (downloadError: unknown) {
      setMessage(downloadError instanceof Error ? downloadError.message : "The file could not be downloaded.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* Editor Column */}
      <section className="space-y-6">
        {/* Title Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Report Title
          </label>
          <input
            value={content.title}
            onChange={(event) => setContent({ ...content, title: event.target.value })}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
          />
          {content.missing_facts.length ? (
            <WarningList title="Facts Requiring Faculty Confirmation" items={content.missing_facts} />
          ) : null}
        </div>

        {/* Section Cards */}
        {content.sections.map((section, sectionIndex) => (
          <section
            key={section.key}
            className={`rounded-2xl border bg-white p-6 shadow-xs transition-colors ${
              section.needs_review ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
              {section.needs_review ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  Review Required
                </span>
              ) : null}
            </div>

            {section.review_notes.length ? (
              <WarningList title="Review Guidance" items={section.review_notes} />
            ) : null}

            <div className="mt-4 space-y-3">
              {section.blocks.map((block, blockIndex) => (
                <textarea
                  key={`${section.key}-${blockIndex}`}
                  value={block.text}
                  onChange={(event) => updateSectionText(sectionIndex, blockIndex, event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                  aria-label={`${section.title} block ${blockIndex + 1}`}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Action Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving Changes…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Save Edits</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={prepareDocx}
            disabled={isSaving || isExporting}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            Render DOCX
          </button>

          <button
            type="button"
            onClick={preparePdf}
            disabled={isSaving || isExporting || !report.docx_storage_path}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Convert to PDF
          </button>

          <button
            type="button"
            onClick={() => download("docx")}
            disabled={isSaving || isExporting || !report.docx_storage_path}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download DOCX
          </button>

          <button
            type="button"
            onClick={() => download("pdf")}
            disabled={isSaving || isExporting || !report.pdf_storage_path}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
          </div>

          {message ? (
            <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </section>

      {/* Live Preview Column */}
      <Preview content={content} status={report.status} />
    </div>
  );
}

function WarningList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
      <p className="font-bold flex items-center gap-1.5 text-amber-900">
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <span>{title}</span>
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900 leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Preview({ content, status }: { content: ReportContent; status: ReportResponse["status"] }) {
  return (
    <article className="h-fit rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm lg:sticky lg:top-20">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Document Preview</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
          {status}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/40 p-6">
        <h1 className="text-center text-xl sm:text-2xl font-extrabold text-slate-900 pb-4 border-b border-dashed border-slate-200">
          {content.title}
        </h1>

        <div className="mt-6 space-y-6">
          {content.sections.map((section) => (
            <section key={section.key}>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {section.title}
              </h2>
              <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
                {section.blocks.map((block, index) => (
                  <p key={`${section.key}-preview-${index}`}>{block.text || "[Empty block]"}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
