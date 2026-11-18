"use client";

import { FormEvent, useState } from "react";

import { createEvent, EventDraft, uploadEventPhoto } from "@/lib/api";

const initialForm: EventDraft = {
  title: "",
  event_date: "",
  department: "",
  venue: "",
  coordinator: "",
  objectives: "",
  activities: "",
  outcomes: "",
};

export function EventForm() {
  const [form, setForm] = useState<EventDraft>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof EventDraft, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      const created = await createEvent(form);
      for (const photo of photos) {
        await uploadEventPhoto(created.id, photo);
      }
      setMessage(`Draft saved with ${photos.length} photograph${photos.length === 1 ? "" : "s"}.`);
      setForm(initialForm);
      setPhotos([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The event could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Event title" value={form.title} required onChange={(value) => updateField("title", value)} />
        <Field label="Event date" type="date" value={form.event_date} required onChange={(value) => updateField("event_date", value)} />
        <Field label="Department" value={form.department} required onChange={(value) => updateField("department", value)} />
        <Field label="Venue" value={form.venue} required onChange={(value) => updateField("venue", value)} />
        <Field label="Coordinator" value={form.coordinator} required onChange={(value) => updateField("coordinator", value)} />
        <Field label="Guest or speaker" value={form.guest ?? ""} onChange={(value) => updateField("guest", value)} />
      </div>
      <TextArea label="Objectives" value={form.objectives} required onChange={(value) => updateField("objectives", value)} />
      <TextArea label="Activities" value={form.activities} required onChange={(value) => updateField("activities", value)} />
      <TextArea label="Outcomes" value={form.outcomes} required onChange={(value) => updateField("outcomes", value)} />
      <TextArea label="Additional verified facts" value={form.additional_facts ?? ""} onChange={(value) => updateField("additional_facts", value)} />
      <label className="block text-sm font-medium">
        Photographs
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
          className="mt-2 block w-full rounded-lg border border-[var(--border)] p-2 text-sm"
        />
        <span className="mt-1 block text-xs font-normal text-[var(--muted)]">JPEG, PNG, or WebP. You can select multiple files.</span>
      </label>
      {photos.length ? <p className="text-sm text-[var(--muted)]">{photos.length} photograph{photos.length === 1 ? "" : "s"} selected.</p> : null}
      <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[var(--brand)] px-5 py-3 font-semibold text-white disabled:opacity-60">
        {isSubmitting ? "Saving draft…" : "Save event draft"}
      </button>
      {message ? <p role="status" className="text-sm text-[var(--muted)]">{message}</p> : null}
    </form>
  );
}

function Field({
  label,
  value,
  type = "text",
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}{required ? " *" : ""}
      <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
    </label>
  );
}

function TextArea({
  label,
  value,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}{required ? " *" : ""}
      <textarea value={value} required={required} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
    </label>
  );
}
