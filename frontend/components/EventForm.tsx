"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";

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

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB limit matching backend config
const MAX_PHOTOS = 20; // 20 photos limit matching backend config
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ValidationErrors = Partial<Record<keyof EventDraft, string>>;

type SubmitFeedback =
  | { type: "success"; message: string; details?: string; eventId?: string }
  | { type: "error"; message: string }
  | null;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventForm() {
  const [form, setForm] = useState<EventDraft>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [feedback, setFeedback] = useState<SubmitFeedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

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

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;

    const warnings: string[] = [];
    const validNewPhotos: File[] = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        warnings.push(`"${file.name}" was skipped: unsupported file type. Only JPEG, PNG, and WebP are allowed.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        warnings.push(`"${file.name}" (${formatFileSize(file.size)}) was skipped: exceeds the 8 MB maximum size.`);
        continue;
      }
      // Check duplicate by name and size
      const isDuplicate = photos.some((p) => p.name === file.name && p.size === file.size);
      if (isDuplicate) {
        warnings.push(`"${file.name}" is already attached.`);
        continue;
      }
      validNewPhotos.push(file);
    }

    const availableSlots = MAX_PHOTOS - photos.length;
    if (validNewPhotos.length > availableSlots) {
      warnings.push(`You can attach up to ${MAX_PHOTOS} photos in total. Only the first ${availableSlots} files were added.`);
    }

    const photosToAdd = validNewPhotos.slice(0, Math.max(0, availableSlots));
    setPhotos((prev) => [...prev, ...photosToAdd]);
    setPhotoWarnings(warnings);

    // Reset the input so re-selecting the same file if needed triggers change
    event.target.value = "";
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  function clearAllPhotos() {
    setPhotos([]);
    setPhotoWarnings([]);
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
    setUploadProgress(photos.length > 0 ? { current: 0, total: photos.length } : null);

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

      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ current: i + 1, total: photos.length });
        await uploadEventPhoto(created.id, photos[i]);
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
      setPhotoWarnings([]);
      setErrors({});
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "The event draft could not be saved. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
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

      <div className="space-y-3">
        <label className="block text-sm font-medium">
          Photographs
          <span className="ml-1 text-xs font-normal text-[var(--muted)]">
            (Optional, up to {MAX_PHOTOS} photos, max 8 MB each)
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={isSubmitting || photos.length >= MAX_PHOTOS}
            onChange={handlePhotoSelection}
            className="mt-2 block w-full rounded-lg border border-[var(--border)] p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[var(--brand)] hover:file:bg-blue-100 disabled:opacity-50"
          />
          <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
            Supported formats: JPEG, PNG, or WebP. You can select multiple files at once.
          </span>
        </label>

        {photoWarnings.length > 0 ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Notice regarding selected files:</p>
              <button
                type="button"
                onClick={() => setPhotoWarnings([])}
                className="text-[11px] underline hover:text-amber-950"
              >
                Dismiss
              </button>
            </div>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {photoWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {photos.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span>
                {photos.length} of {MAX_PHOTOS} photograph{photos.length === 1 ? "" : "s"} selected
              </span>
              <button
                type="button"
                onClick={clearAllPhotos}
                disabled={isSubmitting}
                className="text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove all
              </button>
            </div>
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-white text-xs">
              {photos.map((photo, index) => (
                <li key={`${photo.name}-${index}`} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-500">
                      📷
                    </span>
                    <span className="truncate font-medium text-slate-800" title={photo.name}>
                      {photo.name}
                    </span>
                    <span className="shrink-0 text-slate-400">({formatFileSize(photo.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${photo.name}`}
                    className="shrink-0 font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[var(--brand)] px-5 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? uploadProgress && uploadProgress.total > 0
            ? `Uploading photo ${uploadProgress.current} of ${uploadProgress.total}…`
            : "Saving draft…"
          : "Save event draft"}
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
