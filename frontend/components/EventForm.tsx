"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import {
  analyzeFormat,
  createEvent,
  createFileFormat,
  createTextFormat,
  EventDraft,
  generateReport,
  isPresentationMode,
  uploadEventPhoto,
} from "@/lib/api";

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
type SelectedPhoto = { id: string; file: File; caption: string };

type SubmitFeedback =
  | { type: "success"; message: string; details?: string; eventId?: string; reportId?: string }
  | { type: "error"; message: string }
  | null;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventForm() {
  const [form, setForm] = useState<EventDraft>(initialForm);
  const [formatName, setFormatName] = useState("");
  const [formatDescription, setFormatDescription] = useState("");
  const [formatFile, setFormatFile] = useState<File | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
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
      const isDuplicate = photos.some((photo) => photo.file.name === file.name && photo.file.size === file.size)
        || validNewPhotos.some((photo) => photo.name === file.name && photo.size === file.size);
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

    const photosToAdd = validNewPhotos.slice(0, Math.max(0, availableSlots)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      caption: "",
    }));
    setPhotos((prev) => [...prev, ...photosToAdd]);
    setPhotoWarnings(warnings);
    event.target.value = "";
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  function movePhoto(index: number, offset: number) {
    setPhotos((current) => {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }

  function updatePhotoCaption(id: string, caption: string) {
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, caption } : photo));
  }

  function clearAllPhotos() {
    setPhotos([]);
    setPhotoWarnings([]);
  }

  function handleFormatFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFormatFile(selectedFile);
    setFormatDescription("");
    setFormatError(null);
    event.target.value = "";
  }

  function handleFormatDescriptionChange(value: string) {
    setFormatDescription(value);
    if (value.trim()) setFormatFile(null);
    setFormatError(null);
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

  function validateReferenceFormat(): boolean {
    if (!formatFile && !formatDescription.trim()) {
      setFormatError("Upload a PDF/DOCX reference or describe the required format.");
      document.getElementById("field-reference-format")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    if (!formatName.trim()) {
      setFormatError("A name is required for the reference format.");
      document.getElementById("field-format-name")?.focus();
      return false;
    }
    return true;
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

    if (!validateReferenceFormat()) return;

    setIsSubmitting(true);
    setUploadProgress(photos.length > 0 ? { current: 0, total: photos.length } : null);

    try {
      const formatProfile = formatFile
        ? await createFileFormat(formatName.trim(), formatFile)
        : await createTextFormat(formatName.trim(), formatDescription.trim());
      const analyzedFormat = await analyzeFormat(formatProfile.id);
      if (analyzedFormat.analysis_status !== "ready") {
        throw new Error(analyzedFormat.analysis_error ?? "The reference format could not be analyzed.");
      }

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
        format_profile_id: analyzedFormat.id,
      };

      const created = await createEvent(payload);

      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ current: i + 1, total: photos.length });
        await uploadEventPhoto(created.id, photos[i].file, photos[i].caption);
      }

      const report = await generateReport(created.id);

      setFeedback({
        type: "success",
        message: "Report generated successfully!",
        details: photos.length > 0
          ? `${photos.length} photograph${photos.length === 1 ? "" : "s"} attached. Review the generated report before exporting.`
          : "Review the generated report before exporting.",
        eventId: created.id,
        reportId: report.id,
      });
      setForm(initialForm);
      setFormatName("");
      setFormatDescription("");
      setFormatFile(null);
      setFormatError(null);
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
                {feedback.reportId ? (
                  <Link
                    href={`/reports/${feedback.reportId}/edit`}
                    className="rounded-lg bg-indigo-700 px-4 py-2 text-white shadow-xs hover:bg-indigo-800 transition-colors"
                  >
                    Review & Export
                  </Link>
                ) : null}
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
      <div id="field-reference-format" className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              3
            </span>
            <h2 className="text-base font-bold text-slate-900">Reference Format</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">Required for generation</span>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          {isPresentationMode
            ? "Upload a PDF/DOCX reference or describe the required format. This presentation preview records your choice; automatic format analysis is available after the backend is configured."
            : "Give EventScribe the format your department expects. Upload a PDF/DOCX reference, or describe the format in text. The backend will extract and analyze it before generating the report."}
        </p>

        <Field
          id="field-format-name"
          label="Format Name"
          placeholder="e.g. Annual Department Event Report Format"
          value={formatName}
          required
          onChange={(value) => {
            setFormatName(value);
            setFormatError(null);
          }}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="group relative flex min-h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer">
            <span className="text-sm font-semibold text-slate-800">Upload reference file</span>
            <span className="mt-1 text-xs text-slate-500">PDF or DOCX</span>
            <input
              type="file"
              accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
              disabled={isSubmitting}
              onChange={handleFormatFileSelection}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            {formatFile ? <span className="mt-3 max-w-full truncate text-xs font-semibold text-indigo-700">{formatFile.name}</span> : null}
          </label>

          <div>
            <label htmlFor="field-reference-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Or describe the format
            </label>
            <textarea
              id="field-reference-description"
              value={formatDescription}
              onChange={(event) => handleFormatDescriptionChange(event.target.value)}
              rows={5}
              disabled={isSubmitting}
              placeholder="Describe required headings, order, tone, page layout, signature blocks, and any mandatory sections..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all disabled:bg-slate-50"
            />
          </div>
        </div>

        {formatError ? <p className="text-xs font-semibold text-rose-600" role="alert">{formatError}</p> : null}
      </div>

      {/* Section 4: Photograph Upload Zone */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              4
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
              Click to select event photographs
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
                    key={photo.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <PhotoThumbnail file={photo.file} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800" title={photo.file.name}>
                            {photo.file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">{formatFileSize(photo.file.size)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => movePhoto(index, -1)} disabled={isSubmitting || index === 0} aria-label={`Move ${photo.file.name} up`} className="rounded px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40">↑</button>
                        <button type="button" onClick={() => movePhoto(index, 1)} disabled={isSubmitting || index === photos.length - 1} aria-label={`Move ${photo.file.name} down`} className="rounded px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40">↓</button>
                        <button type="button" onClick={() => removePhoto(index)} disabled={isSubmitting} aria-label={`Remove ${photo.file.name}`} className="rounded px-1.5 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-40">×</button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={photo.caption}
                      maxLength={500}
                      onChange={(event) => updatePhotoCaption(photo.id, event.target.value)}
                      disabled={isSubmitting}
                      aria-label={`Caption for ${photo.file.name}`}
                      placeholder="Caption (optional)"
                      className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
                    />
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
          {isPresentationMode
            ? "Presentation preview: photos and reports are saved in this browser."
            : "The reference will be analyzed by the backend before your report is generated."}
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

function PhotoThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const previewUrl = URL.createObjectURL(file);
    setUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  return url ? (
    <Image src={url} alt={file.name} width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="h-11 w-11 shrink-0 rounded-md bg-indigo-50" />
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
