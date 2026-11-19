import { supabase } from "@/lib/supabase";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const GUEST_SESSION_KEY = "eventscribe-guest-session-token";

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
  const response = await fetch(`${apiBaseUrl}/api/health`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("The EventScribe backend is unavailable.");
  }

  return response.json() as Promise<{ status: string }>;
}

export async function createEvent(event: EventDraft): Promise<CreatedEvent> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return parseResponse<CreatedEvent>(response);
}

export async function uploadEventPhoto(eventId: string, file: File, caption?: string): Promise<void> {
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
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}`, { cache: "no-store" });
  return parseResponse<ReportResponse>(response);
}

export async function updateReportContent(reportId: string, content: ReportContent): Promise<ReportResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  return parseResponse<ReportResponse>(response);
}

export async function listReports(): Promise<ReportResponse[]> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports`, { cache: "no-store" });
  return parseResponse<ReportResponse[]>(response);
}

export async function retryReport(reportId: string): Promise<ReportResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/retry`, { method: "POST" });
  return parseResponse<ReportResponse>(response);
}

export async function deleteReport(reportId: string): Promise<void> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}`, { method: "DELETE" });
  await parseResponse(response);
}

export async function createTextFormat(name: string, description: string): Promise<FormatProfileResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/formats/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  return parseResponse<FormatProfileResponse>(response);
}

export async function createFileFormat(name: string, file: File): Promise<FormatProfileResponse> {
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
  const response = await authenticatedFetch(`${apiBaseUrl}/api/formats/${profileId}/analyze`, {
    method: "POST",
  });
  return parseResponse<FormatProfileResponse>(response);
}

export async function generateReport(eventId: string): Promise<ReportResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/events/${eventId}/generate`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function renderReport(reportId: string): Promise<ReportResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/render`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function convertReportPdf(reportId: string): Promise<ReportResponse> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/convert-pdf`, {
    method: "POST",
  });
  return parseResponse<ReportResponse>(response);
}

export async function downloadReportFile(reportId: string, fileType: "docx" | "pdf"): Promise<Blob> {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/reports/${reportId}/download/${fileType}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `The ${fileType.toUpperCase()} download is not ready.`);
  }
  return response.blob();
}
