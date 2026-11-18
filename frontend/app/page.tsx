import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 text-white shadow-sm shadow-indigo-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">EventScribe</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
            >
              Open Dashboard
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-300/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-4 py-1.5 text-xs font-semibold text-indigo-800 mb-8 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Dynamic AI Academic Event Report Generator
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Create polished event reports from <span className="text-gradient">your facts and format</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed">
            Stop fighting with formatting templates. EventScribe analyzes your department&apos;s reference format, drafts fact-grounded academic prose, and exports editable DOCX and PDF reports.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 transition-all"
            >
              <span>Create New Report</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              View Dashboard
            </Link>
          </div>

          {/* Interactive Document Preview Mockup */}
          <div className="mt-16 mx-auto max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-2xl shadow-indigo-950/10">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-6 text-left">
              {/* Document Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400"></span>
                  <span className="h-3 w-3 rounded-full bg-amber-400"></span>
                  <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
                  <span className="ml-2 font-mono text-[11px] text-slate-600">Sample_Academic_Report.docx</span>
                </div>
                <span className="rounded bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">Dynamic Format Match: 98%</span>
              </div>

              {/* Mock Document Content */}
              <div className="mt-6 space-y-4 font-serif text-slate-800">
                <div className="text-center pb-4 border-b border-dashed border-slate-200">
                  <span className="text-[11px] font-sans uppercase tracking-widest text-slate-500">Department of Computer Science & Engineering</span>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold font-sans text-slate-900">National Workshop on Cloud Computing & AI</h3>
                  <p className="mt-1 text-xs font-sans text-slate-500">Date: October 24, 2026 | Venue: Seminar Hall B | Coordinator: Dr. Jane Doe</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs font-sans">
                  <div className="rounded-lg bg-white p-3 border border-slate-200/80 shadow-2xs">
                    <span className="font-bold text-slate-900">1. Executive Summary</span>
                    <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">The department hosted a technical workshop attended by 120+ participants, exploring distributed inference architectures.</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200/80 shadow-2xs">
                    <span className="font-bold text-slate-900">2. Key Outcomes</span>
                    <p className="mt-1 text-slate-600 leading-relaxed text-[11px]">Students delivered live demos and satisfied accreditation criteria under NAAC Criteria 3.3.2.</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200/80 shadow-2xs">
                    <span className="font-bold text-slate-900">3. Photographic Evidence</span>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <div className="h-12 rounded bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-semibold font-sans">Inauguration</div>
                      <div className="h-12 rounded bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-semibold font-sans">Valedictory</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Props Grid */}
      <section className="border-t border-slate-200/80 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Built for Professors & Departments</span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Why EventScribe makes reporting effortless</h2>
            <p className="mt-3 text-base text-slate-600">No rigid one-size-fits-all forms. Generate compliant reports tailored to your university’s guidelines.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                  </svg>
                ),
                title: "Dynamic Format Understanding",
                description: "Upload any reference PDF or Word document. EventScribe inspects headers, table layouts, and section patterns to replicate the structure.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                ),
                title: "Zero Hallucination Guardrails",
                description: "The AI is strictly grounded in the event facts you provide. Any unverified claims are flagged as review items before finalizing.",
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
                title: "Dual DOCX & PDF Export",
                description: "Export clean Word documents formatted with photographic galleries, plus pixel-perfect submission-ready PDF files with LibreOffice.",
              },
            ].map((feature) => (
              <article
                key={feature.title}
                className="interactive-card rounded-2xl border border-slate-200 bg-slate-50/50 p-8 shadow-xs"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-100/50 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} EventScribe. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
            <Link href="/reports/new" className="hover:text-slate-900">Create Report</Link>
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
