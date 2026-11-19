const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
  || !process.env.NEXT_PUBLIC_SUPABASE_URL
  || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_REPORTS_KEY = "eventscribe-demo-reports";

export type EventDraft = {
  title: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  department: string;
  venue: string;
  coordinator: string;
  guest?: string;
  objectives: string;
  activities: string;
  outcomes: string;
  additional_facts?: string;
};

export type CreatedEvent = EventDraft & { id: string; user_id: string; status: string };

export type ReportBlock = { kind: "paragraph" | "bullet" | "numbered"; text: string; items: string[] };
export type ReportSection = { key: string; title: string; blocks: ReportBlock[]; needs_review: boolean; review_notes: string[] };
export type ReportContent = { schema_version: "1.0"; title: string; sections: ReportSection[]; missing_facts: string[] };
export type ReportResponse = {
  id: string;
  event_id: string;
  user_id: string;
  content_json: ReportContent | null;
  content_version: number;
  status: "draft" | "generating" | "ready" | "failed";
  generation_model: string | null;
  prompt_version: string | null;
  last_error: string | null;
  created_at: string;
};

function demoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now()}`;
}

function readDemoReports(): ReportResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(DEMO_REPORTS_KEY);
    return saved ? JSON.parse(saved) as ReportResponse[] : [];
  } catch {
    return [];
  }
}

function writeDemoReports(reports: ReportResponse[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_REPORTS_KEY, JSON.stringify(reports));
  }
}

function demoContent(event: EventDraft): ReportContent {
  return {
    schema_version: "1.0",
    title: event.title,
    missing_facts: [],
    sections: [
      { key: "overview", title: "Event Overview", needs_review: false, review_notes: [], blocks: [{ kind: "paragraph", text: `${event.title} was conducted on ${event.event_date} by ${event.department} at ${event.venue}. The event was coordinated by ${event.coordinator}.`, items: [] }] },
      { key: "objectives", title: "Objectives", needs_review: false, review_notes: [], blocks: [{ kind: "paragraph", text: event.objectives, items: [] }] },
      { key: "activities", title: "Activities", needs_review: false, review_notes: [], blocks: [{ kind: "paragraph", text: event.activities, items: [] }] },
      { key: "outcomes", title: "Outcomes", needs_review: false, review_notes: [], blocks: [{ kind: "paragraph", text: event.outcomes, items: [] }] },
    ],
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "The request could not be completed.");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export async function getApiHealth(): Promise<{ status: string }> {
  if (demoMode) return { status: "demo" };
  const response = await fetch(`${apiBaseUrl}/api/health`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("The EventScribe backend is unavailable.");
  }

  return response.json() as Promise<{ status: string }>;
}

export async function createEvent(event: EventDraft): Promise<CreatedEvent> {
  if (demoMode) {
    const id = demoId();
    const report: ReportResponse = {
      id,
      event_id: id,
      user_id: "demo-user",
      content_json: demoContent(event),
      content_version: 1,
      status: "ready",
      generation_model: "demo-local",
      prompt_version: "demo",
      last_error: null,
      created_at: new Date().toISOString(),
    };
    writeDemoReports([report, ...readDemoReports()]);
    return { ...event, id, user_id: "demo-user", status: "draft" };
  }
  const response = await fetch(`${apiBaseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return parseResponse<CreatedEvent>(response);
}

export async function uploadEventPhoto(eventId: string, file: File, caption?: string): Promise<void> {
  if (demoMode) return;
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const response = await fetch(`${apiBaseUrl}/api/events/${eventId}/photos`, {
    method: "POST",
    body: formData,
  });
  await parseResponse(response);
}

export async function getReport(reportId: string): Promise<ReportResponse> {
  if (demoMode) {
    const report = readDemoReports().find((item) => item.id === reportId);
    if (!report) throw new Error("Demo report not found.");
    return report;
  }
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportId}`, { cache: "no-store" });
  return parseResponse<ReportResponse>(response);
}

export async function updateReportContent(reportId: string, content: ReportContent): Promise<ReportResponse> {
  if (demoMode) {
    const reports = readDemoReports();
    const index = reports.findIndex((item) => item.id === reportId);
    if (index < 0) throw new Error("Demo report not found.");
    const updated = { ...reports[index], content_json: content, content_version: reports[index].content_version + 1 };
    reports[index] = updated;
    writeDemoReports(reports);
    return updated;
  }
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportId}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  return parseResponse<ReportResponse>(response);
}

export async function listReports(): Promise<ReportResponse[]> {
  if (demoMode) return readDemoReports();
  const response = await fetch(`${apiBaseUrl}/api/reports`, { cache: "no-store" });
  return parseResponse<ReportResponse[]>(response);
}

export async function retryReport(reportId: string): Promise<ReportResponse> {
  if (demoMode) {
    const report = await getReport(reportId);
    return report;
  }
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportId}/retry`, { method: "POST" });
  return parseResponse<ReportResponse>(response);
}

export async function deleteReport(reportId: string): Promise<void> {
  if (demoMode) {
    writeDemoReports(readDemoReports().filter((item) => item.id !== reportId));
    return;
  }
  const response = await fetch(`${apiBaseUrl}/api/reports/${reportId}`, { method: "DELETE" });
  await parseResponse(response);
}
