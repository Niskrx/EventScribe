import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EventForm } from "@/components/EventForm";

export default function NewReportPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
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
            Create Event Report
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Enter verified event details, provide the department reference format, and attach event photographs. EventScribe will analyze the reference through the backend before generating your report.
          </p>
        </div>

        {/* 3-Step Process Indicator */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Event Details & Photos",
              description: "Facts, objectives, and high-res event images",
              active: true,
            },
            {
              step: "02",
              title: "Reference Format",
              description: "PDF/DOCX structure or text guideline",
              active: true,
            },
            {
              step: "03",
              title: "Review & Export",
              description: "Section review, DOCX download, and PDF",
              active: false,
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`rounded-xl border p-4 transition-colors ${
                item.active
                  ? "border-indigo-300 bg-indigo-50/50 shadow-2xs"
                  : "border-slate-200 bg-white opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    item.active ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  Step {item.step}
                </span>
                {item.active && (
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                )}
              </div>
              <h3 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Event Form Component */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <EventForm />
        </div>
      </div>
    </AppShell>
  );
}
