const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "The request could not be completed.");
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
  const response = await fetch(`${apiBaseUrl}/api/events`, {
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
  const response = await fetch(`${apiBaseUrl}/api/events/${eventId}/photos`, {
    method: "POST",
    body: formData,
  });
  await parseResponse(response);
}
