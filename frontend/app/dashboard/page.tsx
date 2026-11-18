import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ReportHistory } from "@/components/ReportHistory";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Workspace Banner */}
        <section className="relative overflow-hidden rounded-3xl brand-gradient p-8 sm:p-10 text-white shadow-xl shadow-indigo-900/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100 backdrop-blur-xs mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Faculty Workspace
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Generate Academic Event Reports</h1>
              <p className="mt-3 text-base text-indigo-100 leading-relaxed max-w-xl">
                Upload your department reference guidelines, fill in event facts, attach photographs, and generate submission-ready reports in seconds.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Link
                href="/reports/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-md hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>New Event Report</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Feature / Workflow Highlights */}
        <section className="grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Dynamic Format Ingestion",
              description: "Upload any reference PDF, Word doc, or style text. EventScribe adapts to your format.",
              badge: "Smart Adaptor",
              icon: (
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 6 3-3m0 0 3 3m-3-3v8.25m-6-16.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              ),
            },
            {
              title: "Verified Fact Grounding",
              description: "Drafts are generated strictly using the facts you submit, preventing hallucinations in official filings.",
              badge: "Zero-Hallucination",
              icon: (
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              ),
            },
            {
              title: "Dual Format Export",
              description: "Instant download as formatted Microsoft Word (.docx) or publication-ready PDF documents.",
              badge: "DOCX & PDF",
              icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              ),
            },
          ].map((card) => (
            <article
              key={card.title}
              className="interactive-card rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                    {card.icon}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.description}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Recent Reports List */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your Reports</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage, edit, re-generate, and download your academic reports.</p>
            </div>
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors self-start sm:self-auto"
            >
              <span>+ Create another report</span>
            </Link>
          </div>
          <div className="mt-6">
            <ReportHistory />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
