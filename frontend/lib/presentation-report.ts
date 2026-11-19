import type { EventDraft, ReportContent } from "./api";
import type { PresentationFormat } from "./presentation-format";

function contentForHeading(title: string, event: EventDraft): string | null {
  const heading = title.toLowerCase();
  if (/\b(photo|photograph|image|gallery|picture)s?\b/.test(heading)) return "";
  if (/\b(signature|approval|seal|certification)s?\b/.test(heading)) return null;
  if (/\b(objective|aim|purpose|goal)s?\b/.test(heading)) return event.objectives;
  if (/\b(activit|session|schedule|programme|program|proceeding|execution|agenda)/.test(heading)) return event.activities;
  if (/\b(outcome|impact|result|feedback|learning|conclusion|achievement)s?\b/.test(heading)) return event.outcomes;
  if (/\b(guest|speaker|resource person|keynote)s?\b/.test(heading)) return event.guest ?? null;
  if (/\b(venue|location|place)s?\b/.test(heading)) return event.venue;
  if (/\b(date|time|duration)s?\b/.test(heading)) return event.event_date;
  if (/\b(department|organis|organiz|coordinator|faculty)s?\b/.test(heading)) return `${event.department}; Coordinator: ${event.coordinator}`;
  if (/\b(additional|other|remark|note)s?\b/.test(heading)) return event.additional_facts ?? null;
  if (/\b(title|name of (the )?event|event name)\b/.test(heading)) return event.title;
  if (/\b(overview|intro|summary|background|about|description|report|event details|event information|details of (the )?event)\b/.test(heading)) {
    return `${event.title} was conducted on ${event.event_date} by ${event.department} at ${event.venue}. The event was coordinated by ${event.coordinator}${event.guest ? `, with ${event.guest} as a guest or speaker.` : "."}`;
  }
  return null;
}

export function presentationContent(event: EventDraft, format: PresentationFormat): ReportContent {
  const missing: string[] = [];
  return {
    schema_version: "1.0",
    title: event.title,
    missing_facts: missing,
    sections: format.sections.map((section) => {
      const text = contentForHeading(section.title, event);
      const photoSection = section.key === format.images.heading_key;
      if (text === null) missing.push(section.title);
      return {
        key: section.key,
        title: section.title,
        needs_review: text === null,
        review_notes: text === null ? ["Add verified event details for this reference section before export."] : [],
        blocks: photoSection ? [] : [{ kind: "paragraph" as const, text: text ?? "", items: [] }],
      };
    }),
  };
}
