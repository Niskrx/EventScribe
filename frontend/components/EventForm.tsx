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
        warnings.push(`"${file.name}" was skipped: unsupported format. Please use JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        warnings.push(`"${file.name}" (${formatFileSize(file.size)}) exceeds the 8 MB maximum limit.`);
        continue;
      }
      const isDuplicate = photos.some((p) => p.name === file.name && p.size === file.size);
      if (isDuplicate) {
        warnings.push(`"${file.name}" has already been attached.`);
        continue;
      }
      validNewPhotos.push(file);
    }

    const availableSlots = MAX_PHOTOS - photos.length;
    if (validNewPhotos.length > availableSlots) {
      warnings.push(`You can attach up to ${MAX_PHOTOS} photos. Added the first ${availableSlots} files.`);
    }

    const photosToAdd = validNewPhotos.slice(0, Math.max(0, availableSlots));
    setPhotos((prev) => [...prev, ...photosToAdd]);
    setPhotoWarnings(warnings);
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
      errs.coordinator = "Coordinator name is required.";
    }
    if (!form.objectives.trim()) {
      errs.objectives = "Objectives are required.";
    }
    if (!form.activities.trim()) {
      errs.activities = "Activities summary is required.";
    }
    if (!form.outcomes.trim()) {
      errs.outcomes = "Key outcomes are required.";
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
        message: "Event draft successfully saved!",
        details: photos.length > 0
          ? `${photos.length} photograph${photos.length === 1 ? "" : "s"} attached to this draft.`
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
    <form onSubmit={submit} noValidate className="space-y-8">
      {/* Success Feedback Alert */}
      {feedback?.type === "success" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-5 text-sm text-emerald-900 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 font-bold text-emerald-800 text-xs">
              ✓
            </span>
            <div className="flex-1">
              <p className="font-bold text-base text-emerald-900">{feedback.message}</p>
              {feedback.details ? <p className="mt-1 text-xs text-emerald-700">{feedback.details}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-white shadow-xs hover:bg-emerald-800 transition-colors"
                >
                  View in Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  Create another draft
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error Feedback Alert */}
      {feedback?.type === "error" ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/90 p-5 text-sm text-rose-900 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-200 font-bold text-rose-800 text-xs">
              !
            </span>
            <div>
              <p className="font-bold text-base text-rose-900">Unable to save draft</p>
              <p className="mt-1 text-xs text-rose-700">{feedback.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Validation Warnings Summary */}
      {Object.keys(errors).length > 0 ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
          <p className="font-semibold text-xs uppercase tracking-wider text-rose-800">
            Please fill in {Object.keys(errors).length} required field{Object.keys(errors).length === 1 ? "" : "s"}:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-rose-700">
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
                  className="font-medium underline hover:text-rose-950"
                >
                  {err}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Section 1: Basic Event Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            1
          </span>
          <h2 className="text-base font-bold text-slate-900">Event Overview & Logistics</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              id="field-title"
              label="Event Title"
              placeholder="e.g. National Workshop on Generative AI & Cloud Platforms"
              value={form.title}
              required
              error={errors.title}
              onChange={(value) => updateField("title", value)}
            />
          </div>
          <Field
            id="field-event_date"
            label="Event Date"
            type="date"
            value={form.event_date}
            required
            error={errors.event_date}
            onChange={(value) => updateField("event_date", value)}
          />
          <Field
            id="field-department"
            label="Department / Organizing Body"
            placeholder="e.g. Department of Computer Science & Engineering"
            value={form.department}
            required
            error={errors.department}
            onChange={(value) => updateField("department", value)}
          />
          <Field
            id="field-venue"
            label="Venue / Location"
            placeholder="e.g. Main Auditorium Hall B"
            value={form.venue}
            required
            error={errors.venue}
            onChange={(value) => updateField("venue", value)}
          />
          <Field
            id="field-coordinator"
            label="Faculty Coordinator"
            placeholder="e.g. Dr. Jane Doe, Associate Professor"
            value={form.coordinator}
            required
            error={errors.coordinator}
            onChange={(value) => updateField("coordinator", value)}
          />
          <div className="md:col-span-2">
            <Field
              id="field-guest"
              label="Distinguished Guests / Keynote Speakers"
              placeholder="e.g. Dr. Alan Turing, Director of Research, AI Institute (Optional)"
              value={form.guest ?? ""}
              onChange={(value) => updateField("guest", value)}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Academic Content */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            2
          </span>
          <h2 className="text-base font-bold text-slate-900">Academic Narrative & Core Facts</h2>
        </div>

        <div className="space-y-5">
          <TextArea
            id="field-objectives"
            label="Objectives & Purpose"
            placeholder="State the primary educational and institutional goals of the event..."
            value={form.objectives}
            required
            error={errors.objectives}
            onChange={(value) => updateField("objectives", value)}
          />
          <TextArea
            id="field-activities"
            label="Key Activities & Schedule Highlights"
            placeholder="Summarize the sessions, demonstrations, panel discussions, or competitions conducted..."
            value={form.activities}
            required
            error={errors.activities}
            onChange={(value) => updateField("activities", value)}
          />
          <TextArea
            id="field-outcomes"
            label="Outcomes & Participant Impact"
            placeholder="Describe the measurable learning outcomes, participant count, feedback, and accreditation relevance..."
            value={form.outcomes}
            required
            error={errors.outcomes}
            onChange={(value) => updateField("outcomes", value)}
          />
          <TextArea
            id="field-additional_facts"
            label="Additional Verified Facts"
            placeholder="Sponsors, budget details, student prize winners, or future follow-ups (Optional)..."
            value={form.additional_facts ?? ""}
            onChange={(value) => updateField("additional_facts", value)}
          />
        </div>
      </div>

      {/* Section 3: Photograph Upload Zone */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              3
            </span>
            <h2 className="text-base font-bold text-slate-900">Photographic Evidence</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {photos.length} / {MAX_PHOTOS} attached
          </span>
        </div>

        <div className="space-y-3">
          <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-2xs border border-slate-200 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Click to select or drop event photographs
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Supports JPEG, PNG, or WebP (max 8 MB per image, up to {MAX_PHOTOS} photos)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isSubmitting || photos.length >= MAX_PHOTOS}
              onChange={handlePhotoSelection}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </label>

          {photoWarnings.length > 0 ? (
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Notice regarding selected photos:</p>
                <button
                  type="button"
                  onClick={() => setPhotoWarnings([])}
                  className="text-[11px] font-semibold underline hover:text-amber-950"
                >
                  Dismiss
                </button>
              </div>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                {photoWarnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {photos.length > 0 ? (
            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Selected Photo Attachments</span>
                <button
                  type="button"
                  onClick={clearAllPhotos}
                  disabled={isSubmitting}
                  className="text-rose-600 hover:text-rose-800 transition-colors disabled:opacity-50"
                >
                  Remove all
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </span>
                      <div className="truncate">
                        <p className="truncate font-semibold text-slate-800" title={photo.name}>
                          {photo.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{formatFileSize(photo.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      disabled={isSubmitting}
                      aria-label={`Remove ${photo.name}`}
                      className="shrink-0 p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Submission Bar */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Saved drafts can be paired with any format profile in the next step.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>
                {uploadProgress && uploadProgress.total > 0
                  ? `Uploading photo ${uploadProgress.current} of ${uploadProgress.total}…`
                  : "Saving draft…"}
              </span>
            </>
          ) : (
            <>
              <span>Save Event Draft</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  type = "text",
  required = false,
  error,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  type?: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required ? <span className="text-rose-500 ml-1">*</span> : null}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all outline-none ${
          error
            ? "border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500 focus:ring-3 focus:ring-rose-200"
            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextArea({
  id,
  label,
  placeholder,
  value,
  required = false,
  error,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
        {required ? <span className="text-rose-500 ml-1">*</span> : null}
      </label>
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all outline-none leading-relaxed ${
          error
            ? "border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500 focus:ring-3 focus:ring-rose-200"
            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
