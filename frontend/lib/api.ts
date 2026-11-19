import { supabase } from "@/lib/supabase";
import { deletePresentationPhotos, getPresentationPhotos, savePresentationPhoto, type ReportPhoto } from "@/lib/presentation-photos";
import { analyzeReferenceFile, analyzeTextFormat, asPresentationFormat, type PresentationFormat } from "@/lib/presentation-format";
import { presentationContent } from "@/lib/presentation-report";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GUEST_SESSION_KEY = "eventscribe-guest-session-token";
const PRESENTATION_USER_KEY = "eventscribe-presentation-user";
const PRESENTATION_EVENTS_KEY = "eventscribe-presentation-events";
const PRESENTATION_FORMATS_KEY = "eventscribe-presentation-formats";
const PRESENTATION_REPORTS_KEY = "eventscribe-presentation-reports";
const presentationMode = !supabase;
export const isPresentationMode = presentationMode;

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

export type ReportBlock = { kind: "paragraph" | "bullet" | "numbered" | "table"; text: string; items: string[]; rows?: string[][] };
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

function presentationFormatForEvent(event: CreatedEvent): PresentationFormat {
  const profile = readPresentation<FormatProfileResponse>(PRESENTATION_FORMATS_KEY)
    .find((item) => item.id === event.format_profile_id);
  const format = asPresentationFormat(profile?.format_spec ?? null);
  if (!format || profile?.analysis_status !== "ready") {
    throw new Error("The reference format has not been analyzed. Recreate this report with a readable PDF/DOCX or a list of headings.");
  }
  return format;
}

export function getPresentationFormatForReport(reportId: string): PresentationFormat | null {
  if (!presentationMode) return null;
  const report = presentationReport(reportId);
  const event = readPresentation<CreatedEvent>(PRESENTATION_EVENTS_KEY).find((item) => item.id === report.event_id);
  return event ? presentationFormatForEvent(event) : null;
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
  if (presentationMode) return savePresentationPhoto(eventId, file, caption);
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/photos`, {
    method: "POST",
    body: formData,
  });
  await parseResponse(response);
}

export async function getEventPhotos(eventId: string): Promise<ReportPhoto[]> {
  if (presentationMode) return getPresentationPhotos(eventId);
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/photos`, { cache: "no-store" });
  const records = await parseResponse<Array<{
    id: string;
    original_filename: string;
    caption: string | null;
    sort_order: number;
  }>>(response);
  return Promise.all(records.map(async (record) => {
    const imageResponse = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/photos/${record.id}/file`);
    if (!imageResponse.ok) throw new Error(`Could not load ${record.original_filename}.`);
    const blob = await imageResponse.blob();
    const dimensions = await createImageBitmap(blob);
    const photo: ReportPhoto = {
      id: record.id,
      eventId,
      name: record.original_filename,
      caption: record.caption,
      blob,
      width: dimensions.width,
      height: dimensions.height,
      order: record.sort_order,
    };
    dimensions.close();
    return photo;
  }));
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
    const report = presentationReport(reportId);
    await deletePresentationPhotos(report.event_id);
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
    const format = analyzeTextFormat(description, name);
    const profile: FormatProfileResponse = {
      id: demoId(),
      user_id: presentationUserId(),
      name,
      source_type: "text",
      source_storage_path: null,
      analysis_status: "ready",
      format_spec: format as unknown as Record<string, unknown>,
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
    const format = await analyzeReferenceFile(file);
    const profile: FormatProfileResponse = {
      id: demoId(),
      user_id: presentationUserId(),
      name,
      source_type: file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf",
      source_storage_path: file.name,
      analysis_status: "ready",
      format_spec: format as unknown as Record<string, unknown>,
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
    if (!asPresentationFormat(profile.format_spec)) throw new Error("The reference format could not be analyzed.");
    return profile;
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
    const format = presentationFormatForEvent(event);
    const existing = readPresentation<ReportResponse>(PRESENTATION_REPORTS_KEY).find((item) => item.event_id === eventId);
    const report: ReportResponse = {
      id: existing?.id ?? demoId(),
      event_id: event.id,
      user_id: event.user_id,
      content_json: presentationContent(event, format),
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
    if (!report.content_json) throw new Error("Report content is not ready.");
    const event = readPresentation<CreatedEvent>(PRESENTATION_EVENTS_KEY).find((item) => item.id === report.event_id);
    if (!event) throw new Error("Presentation event not found.");
    const format = presentationFormatForEvent(event);
    const photos = await getPresentationPhotos(report.event_id);
    const { presentationDocx, presentationPdf } = await import("@/lib/presentation-export");
    return fileType === "pdf"
      ? presentationPdf(report.content_json, photos, format)
      : presentationDocx(report.content_json, photos, format);
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/download/${fileType}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `The ${fileType.toUpperCase()} download is not ready.`);
  }
  return response.blob();
}
