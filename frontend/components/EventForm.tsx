"use client";

import Link from "next/link";
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

type ValidationErrors = Partial<Record<keyof EventDraft, string>>;

type SubmitFeedback =
  | { type: "success"; message: string; details?: string; eventId?: string }
  | { type: "error"; message: string }
  | null;

export function EventForm() {
  const [form, setForm] = useState<EventDraft>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [feedback, setFeedback] = useState<SubmitFeedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof EventDraft, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateForm(): ValidationErrors {
    const errs: ValidationErrors = {};

    if (!form.title.trim()) {
      errs.title = "Event title is required.";
    }
    if (!form.event_date.trim()) {
      errs.event_date = "Event date is required.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.event_date.trim())) {
      errs.event_date = "Please enter a valid date in YYYY-MM-DD format.";
    }
    if (!form.department.trim()) {
      errs.department = "Department or organizing body is required.";
    }
    if (!form.venue.trim()) {
      errs.venue = "Venue is required.";
    }
    if (!form.coordinator.trim()) {
      errs.coordinator = "Coordinator is required.";
    }
    if (!form.objectives.trim()) {
      errs.objectives = "Objectives are required.";
    }
    if (!form.activities.trim()) {
      errs.activities = "Activities are required.";
    }
    if (!form.outcomes.trim()) {
      errs.outcomes = "Outcomes are required.";
    }

    return errs;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedback(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstField = Object.keys(validationErrors)[0] as keyof EventDraft;
      const el = document.getElementById(`field-${firstField}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: EventDraft = {
        title: form.title.trim(),
        event_date: form.event_date.trim(),
        department: form.department.trim(),
        venue: form.venue.trim(),
        coordinator: form.coordinator.trim(),
        guest: form.guest?.trim() || undefined,
        objectives: form.objectives.trim(),
        activities: form.activities.trim(),
        outcomes: form.outcomes.trim(),
        additional_facts: form.additional_facts?.trim() || undefined,
      };

      const created = await createEvent(payload);
      for (const photo of photos) {
        await uploadEventPhoto(created.id, photo);
      }

      setFeedback({
        type: "success",
        message: "Event draft saved successfully!",
        details: photos.length > 0
          ? `${photos.length} photograph${photos.length === 1 ? "" : "s"} uploaded with this event.`
          : "Saved without photographs.",
        eventId: created.id,
      });
      setForm(initialForm);
      setPhotos([]);
      setErrors({});
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "The event draft could not be saved. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      {feedback?.type === "success" ? (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 font-bold text-green-800">✓</span>
            <div className="flex-1">
              <p className="font-semibold">{feedback.message}</p>
              {feedback.details ? <p className="mt-1 text-xs text-green-700">{feedback.details}</p> : null}
              <div className="mt-3 flex gap-3 text-xs font-semibold">
                <Link href="/dashboard" className="rounded-md bg-green-700 px-3 py-1.5 text-white hover:bg-green-800">
                  View in Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="rounded-md border border-green-300 px-3 py-1.5 text-green-800 hover:bg-green-100"
                >
                  Create another draft
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {feedback?.type === "error" ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 font-bold text-red-800">!</span>
            <div>
              <p className="font-semibold">Unable to save draft</p>
              <p className="mt-1 text-xs text-red-700">{feedback.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">
            Please fill in the {Object.keys(errors).length} required field{Object.keys(errors).length === 1 ? "" : "s"} highlighted below:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-red-700">
            {Object.entries(errors).map(([field, err]) => (
              <li key={field}>
                <a
                  href={`#field-${field}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(`field-${field}`);
                    el?.focus();
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="font-medium underline hover:text-red-900"
                >
                  {err}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="field-title"
          label="Event title"
          value={form.title}
          required
          error={errors.title}
          onChange={(value) => updateField("title", value)}
        />
        <Field
          id="field-event_date"
          label="Event date"
          type="date"
          value={form.event_date}
          required
          error={errors.event_date}
          onChange={(value) => updateField("event_date", value)}
        />
        <Field
          id="field-department"
          label="Department"
          value={form.department}
          required
          error={errors.department}
          onChange={(value) => updateField("department", value)}
        />
        <Field
          id="field-venue"
          label="Venue"
          value={form.venue}
          required
          error={errors.venue}
          onChange={(value) => updateField("venue", value)}
        />
        <Field
          id="field-coordinator"
          label="Coordinator"
          value={form.coordinator}
          required
          error={errors.coordinator}
          onChange={(value) => updateField("coordinator", value)}
        />
        <Field
          id="field-guest"
          label="Guest or speaker"
          value={form.guest ?? ""}
          onChange={(value) => updateField("guest", value)}
        />
      </div>

      <TextArea
        id="field-objectives"
        label="Objectives"
        value={form.objectives}
        required
        error={errors.objectives}
        onChange={(value) => updateField("objectives", value)}
      />
      <TextArea
        id="field-activities"
        label="Activities"
        value={form.activities}
        required
        error={errors.activities}
        onChange={(value) => updateField("activities", value)}
      />
      <TextArea
        id="field-outcomes"
        label="Outcomes"
        value={form.outcomes}
        required
        error={errors.outcomes}
        onChange={(value) => updateField("outcomes", value)}
      />
      <TextArea
        id="field-additional_facts"
        label="Additional verified facts"
        value={form.additional_facts ?? ""}
        onChange={(value) => updateField("additional_facts", value)}
      />

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

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[var(--brand)] px-5 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving draft…" : "Save event draft"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  type = "text",
  required = false,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}{required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-200"
            : "border-[var(--border)] bg-white focus:border-[var(--brand)] focus:ring-blue-100"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  required = false,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}{required ? " *" : ""}
      </label>
      <textarea
        id={id}
        value={value}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus:ring-2 ${
          error
            ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-200"
            : "border-[var(--border)] bg-white focus:border-[var(--brand)] focus:ring-blue-100"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
