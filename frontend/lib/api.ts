import { supabase } from "@/lib/supabase";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GUEST_SESSION_KEY = "eventscribe-guest-session-token";
const PRESENTATION_USER_KEY = "eventscribe-presentation-user";
const PRESENTATION_EVENTS_KEY = "eventscribe-presentation-events";
const PRESENTATION_FORMATS_KEY = "eventscribe-presentation-formats";
const PRESENTATION_REPORTS_KEY = "eventscribe-presentation-reports";
const presentationMode = !supabase;

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
  format_profile_id?: string;
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
  docx_storage_path: string | null;
  pdf_storage_path: string | null;
  created_at: string;
};

export type FormatProfileResponse = {
  id: string;
  user_id: string;
  name: string;
  source_type: "pdf" | "docx" | "text";
  source_storage_path: string | null;
  analysis_status: "pending" | "ready" | "failed";
  format_spec: Record<string, unknown> | null;
  analysis_error: string | null;
  created_at: string;
};

function demoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `presentation-${Date.now()}`;
}

function presentationUserId(): string {
  if (typeof window === "undefined") return "presentation-workspace";
  const saved = window.sessionStorage.getItem(PRESENTATION_USER_KEY);
  if (saved) return saved;
  const id = `presentation-${demoId()}`;
  window.sessionStorage.setItem(PRESENTATION_USER_KEY, id);
  return id;
}

function readPresentation<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T[] : [];
  } catch {
    return [];
  }
}

function writePresentation<T>(key: string, value: T[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function presentationContent(event: EventDraft): ReportContent {
  return {
    schema_version: "1.0",
    title: event.title,
    missing_facts: [],
    sections: [
      {
        key: "overview",
        title: "Event Overview",
        needs_review: false,
        review_notes: [],
        blocks: [{
          kind: "paragraph",
          text: `${event.title} was conducted on ${event.event_date} by ${event.department} at ${event.venue}. The event was coordinated by ${event.coordinator}${event.guest ? `, with ${event.guest} as the distinguished guest or speaker.` : "."}`,
          items: [],
        }],
      },
      {
        key: "objectives",
        title: "Objectives",
        needs_review: false,
        review_notes: [],
        blocks: [{ kind: "paragraph", text: event.objectives, items: [] }],
      },
      {
        key: "activities",
        title: "Activities and Execution",
        needs_review: false,
        review_notes: [],
        blocks: [{ kind: "paragraph", text: event.activities, items: [] }],
      },
      {
        key: "outcomes",
        title: "Outcomes and Impact",
        needs_review: false,
        review_notes: [],
        blocks: [{ kind: "paragraph", text: event.outcomes, items: [] }],
      },
      ...(event.additional_facts
        ? [{
            key: "additional-facts",
            title: "Additional Verified Facts",
            needs_review: false,
            review_notes: [],
            blocks: [{ kind: "paragraph" as const, text: event.additional_facts, items: [] }],
          }]
        : []),
    ],
  };
}

function presentationReportText(report: ReportResponse): string {
  const sections = report.content_json?.sections ?? [];
  return [
    report.content_json?.title ?? "Event Report",
    "",
    ...sections.flatMap((section) => [section.title, ...section.blocks.map((block) => block.text), ""]),
  ].join("\n");
}

function presentationReport(reportId: string): ReportResponse {
  const report = readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY).find((item) => item.id === reportId);
  if (!report) throw new Error("Presentation report not found.");
  return report;
}

function savePresentationReport(report: ReportResponse): ReportResponse {
  const reports = readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY);
  const index = reports.findIndex((item) => item.id === report.id);
  if (index === -1) reports.unshift(report);
  else reports[index] = report;
  writePresentation(PRESENTATION_REPORTS_KEY, reports);
  return report;
}

function createPresentationPdf(report: ReportResponse): Blob {
  const lines = presentationReportText(report)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "?")
    .split("\n")
    .flatMap((line) => line.match(/.{1,90}/g) ?? [""]);
  const escapePdfText = (line: string) => line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = [
    "BT",
    "/F1 12 Tf",
    "50 760 Td",
    ...lines.slice(0, 38).map((line, index) => `${index ? "0 -18 Td\n" : ""}(${escapePdfText(line)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  pdf += `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return fetch(input, { ...init, headers });
  }

  if (typeof window === "undefined") {
    throw new Error("A browser workspace is required for guest access.");
  }

  let guestToken = window.sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!guestToken) {
    guestToken = await createGuestSession();
    window.sessionStorage.setItem(GUEST_SESSION_KEY, guestToken);
  }
  headers.set("X-Eventscribe-Guest", guestToken);
  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    window.sessionStorage.removeItem(GUEST_SESSION_KEY);
    guestToken = await createGuestSession();
    window.sessionStorage.setItem(GUEST_SESSION_KEY, guestToken);
    headers.set("X-Eventscribe-Guest", guestToken);
    response = await fetch(input, { ...init, headers });
  }

  return response;
}

async function createGuestSession(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/api/guest/session`, { method: "POST" });
  const payload = await parseResponse<{ token: string }>(response);
  return payload.token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {
      detail?: string;
      error?: { message?: string };
    } | null;
    throw new Error(payload?.detail ?? payload?.error?.message ?? "The request could not be completed.");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export async function getApiHealth(): Promise<{ status: string }> {
  if (presentationMode) return { status: "presentation" };
  const response = await fetch(`${apiBaseUrl}/api/health`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("The EventScribe backend is unavailable.");
  }

  return response.json() as Promise<{ status: string }>;
}

export async function createEvent(event: EventDraft): Promise<CreatedEvent> {
  if (presentationMode) {
    const created: CreatedEvent = {
      ...event,
      id: demoId(),
      user_id: presentationUserId(),
      status: "draft",
    };
    writePresentation(PRESENTATION_EVENTS_KEY, [created, ...readPresentation<CreatedEvent>(PRESENTATION_EVENTS_KEY)]);
    return created;
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return parseResponse<CreatedEvent>(response);
}

export async function uploadEventPhoto(eventId: string, file: File, caption?: string): Promise<void> {
  if (presentationMode) return;
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/photos`, {
    method: "POST",
    body: formData,
  });
  await parseResponse(response);
}

export async function getReport(reportId: string): Promise<ReportResponse> {
  if (presentationMode) return presentationReport(reportId);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}`, { cache: "no-store" });
  return parseResponse<ReportResponse>(response);
}

export async function updateReportContent(reportId: string, content: ReportContent): Promise<ReportResponse> {
  if (presentationMode) {
    const current = presentationReport(reportId);
    return savePresentationReport({
      ...current,
      content_json: content,
      content_version: current.content_version + 1,
      status: "draft",
      last_error: null,
    });
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  return parseResponse<ReportResponse>(response);
}

export async function listReports(): Promise<ReportResponse[]> {
  if (presentationMode) return readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports`, { cache: "no-store" });
  return parseResponse<ReportResponse[]>(response);
}

export async function retryReport(reportId: string): Promise<ReportResponse> {
  if (presentationMode) {
    const current = presentationReport(reportId);
    return savePresentationReport({ ...current, status: "ready", last_error: null });
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/retry`, { method: "POST" });
  return parseResponse<ReportResponse>(response);
}

export async function deleteReport(reportId: string): Promise<void> {
  if (presentationMode) {
    writePresentation(
      PRESENTATION_REPORTS_KEY,
      readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY).filter((item) => item.id !== reportId),
    );
    return;
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}`, { method: "DELETE" });
  await parseResponse(response);
}

export async function createTextFormat(name: string, description: string): Promise<FormatProfileResponse> {
  if (presentationMode) {
    const profile: FormatProfileResponse = {
      id: demoId(),
      user_id: presentationUserId(),
      name,
      source_type: "text",
      source_storage_path: null,
      analysis_status: "pending",
      format_spec: null,
      analysis_error: null,
      created_at: new Date().toISOString(),
    };
    writePresentation(PRESENTATION_FORMATS_KEY, [profile, ...readPresentation<FormatProfileResponse>(PRESENTATION_FORMATS_KEY)]);
    return profile;
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/formats/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return parseResponse<FormatProfileResponse>(response);
}

export async function createFileFormat(name: string, file: File): Promise<FormatProfileResponse> {
  if (presentationMode) {
    const profile: FormatProfileResponse = {
      id: demoId(),
      user_id: presentationUserId(),
      name,
      source_type: file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf",
      source_storage_path: file.name,
      analysis_status: "pending",
      format_spec: null,
      analysis_error: null,
      created_at: new Date().toISOString(),
    };
    writePresentation(PRESENTATION_FORMATS_KEY, [profile, ...readPresentation<FormatProfileResponse>(PRESENTATION_FORMATS_KEY)]);
    return profile;
  }
  const formData = new FormData();
  formData.append("name", name);
  formData.append("file", file);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/formats/file`, {
    method: "POST",
    body: formData,
  });
  return parseResponse<FormatProfileResponse>(response);
}

export async function analyzeFormat(profileId: string): Promise<FormatProfileResponse> {
  if (presentationMode) {
    const profiles = readPresentation<FormatProfileResponse>(PRESENTATION_FORMATS_KEY);
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) throw new Error("Presentation format profile not found.");
    const analyzed = {
      ...profile,
      analysis_status: "ready" as const,
      format_spec: { presentation: true },
      analysis_error: null,
    };
    writePresentation(PRESENTATION_FORMATS_KEY, profiles.map((item) => item.id === profileId ? analyzed : item));
    return analyzed;
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/formats/${profileId}/analyze`, {
    method: "POST",
  });
  return parseResponse<FormatProfileResponse>(response);
}

export async function generateReport(eventId: string): Promise<ReportResponse> {
  if (presentationMode) {
    const event = readPresentation<CreatedEvent>(PRESENTATION_EVENTS_KEY).find((item) => item.id === eventId);
    if (!event) throw new Error("Presentation event not found.");
    const existing = readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY).find((item) => item.event_id === eventId);
    const report: ReportResponse = {
      id: existing?.id ?? demoId(),
      event_id: event.id,
      user_id: event.user_id,
      content_json: presentationContent(event),
      content_version: existing ? existing.content_version + 1 : 1,
      status: "ready",
      generation_model: "presentation-preview",
      prompt_version: "presentation",
      last_error: null,
      docx_storage_path: existing?.docx_storage_path ?? null,
      pdf_storage_path: existing?.pdf_storage_path ?? null,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    return savePresentationReport(report);
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/generate`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function renderReport(reportId: string): Promise<ReportResponse> {
  if (presentationMode) {
    const current = presentationReport(reportId);
    return savePresentationReport({ ...current, docx_storage_path: `presentation/${reportId}.docx` });
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/render`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function convertReportPdf(reportId: string): Promise<ReportResponse> {
  if (presentationMode) {
    const current = presentationReport(reportId);
    if (!current.docx_storage_path) throw new Error("Render the DOCX before converting it to PDF.");
    return savePresentationReport({ ...current, pdf_storage_path: `presentation/${reportId}.pdf` });
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/convert-pdf`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function downloadReportFile(reportId: string, fileType: "docx" | "pdf"): Promise<Blob> {
  if (presentationMode) {
    const report = presentationReport(reportId);
    if (fileType === "pdf") return createPresentationPdf(report);
    return new Blob([presentationReportText(report)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/download/${fileType}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `The ${fileType.toUpperCase()} download is not ready.`);
  }
  return response.blob();
}
