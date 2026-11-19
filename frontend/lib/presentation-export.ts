import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

import type { ReportContent } from "@/lib/api";
import type { PresentationFormat } from "@/lib/presentation-format";
import type { ReportPhoto } from "@/lib/presentation-photos";

async function photoDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  return `data:${blob.type};base64,${btoa(binary)}`;
}

function docxAlignment(value: string) {
  if (value === "center") return AlignmentType.CENTER;
  if (value === "right") return AlignmentType.RIGHT;
  if (value === "justify") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function pdfFont(value: string): "times" | "courier" | "helvetica" {
  if (/times|serif|georgia|cambria/i.test(value)) return "times";
  if (/courier|mono/i.test(value)) return "courier";
  return "helvetica";
}

export async function presentationDocx(content: ReportContent, photos: ReportPhoto[], format: PresentationFormat): Promise<Blob> {
  const font = format.style.font_family;
  const bodySize = format.style.body_font_size_pt;
  const children: Paragraph[] = [new Paragraph({
    alignment: docxAlignment(format.style.heading_alignment),
    spacing: { after: 320 },
    children: [new TextRun({ text: content.title, bold: true, font, size: Math.round((bodySize + 5) * 2) })],
  })];

  async function addPhotos() {
    for (const photo of photos) {
      const width = Math.min(480, photo.width, 620 * photo.width / photo.height);
      const height = Math.max(1, Math.round(width * photo.height / photo.width));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 80 },
        children: [new ImageRun({ type: "jpg", data: new Uint8Array(await photo.blob.arrayBuffer()),
          transformation: { width, height }, altText: { title: photo.name, description: photo.caption ?? photo.name } })],
      }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
        children: [new TextRun({ text: photo.caption ?? photo.name, font, size: Math.round(Math.max(8, bodySize - 2) * 2) })] }));
    }
  }

  let photosPlaced = false;
  for (const section of content.sections) {
    const rule = format.sections.find((candidate) => candidate.key === section.key);
    const level = Math.min(6, Math.max(1, rule?.heading_level ?? 1));
    const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][level - 1];
    children.push(new Paragraph({ heading, alignment: docxAlignment(format.style.heading_alignment),
      pageBreakBefore: rule?.page_break_before, spacing: { before: 220, after: 120 },
      children: [new TextRun({ text: section.title, bold: true, font,
        size: Math.round((bodySize + Math.max(1, 4 - level)) * 2) })] }));
    for (const block of section.blocks) {
      const text = block.items.length ? block.items.join("\n") : block.text;
      if (!text.trim()) continue;
      const paragraphs = rule?.content_type === "bullets" || rule?.content_type === "numbered_list"
        ? text.split(/\n+/).map((item) => item.trim()).filter(Boolean) : [text];
      for (const [index, paragraph] of paragraphs.entries()) {
        children.push(new Paragraph({ alignment: docxAlignment(format.style.body_alignment),
          bullet: rule?.content_type === "bullets" ? { level: 0 } : undefined,
          spacing: { after: 160, line: 276 },
          children: [new TextRun({ text: rule?.content_type === "numbered_list" ? `${index + 1}. ${paragraph}` : paragraph,
            font, size: Math.round(bodySize * 2) })] }));
      }
    }
    if (photos.length && section.key === format.images.heading_key) { await addPhotos(); photosPlaced = true; }
  }
  if (photos.length && !photosPlaced) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
      children: [new TextRun({ text: "Photographs", bold: true, font, size: Math.round((bodySize + 3) * 2) })] }));
    await addPhotos();
  }

  const margin = format.style.margins;
  const document = new Document({ sections: [{ properties: { page: {
    size: { width: Math.round(format.style.page_width_mm * 56.7), height: Math.round(format.style.page_height_mm * 56.7) },
    margin: { top: Math.round(margin.top_cm * 567), right: Math.round(margin.right_cm * 567),
      bottom: Math.round(margin.bottom_cm * 567), left: Math.round(margin.left_cm * 567) },
  } }, children }] });
  return Packer.toBlob(document);
}

export async function presentationPdf(content: ReportContent, photos: ReportPhoto[], format: PresentationFormat): Promise<Blob> {
  const pageWidth = format.style.page_width_mm;
  const pageHeight = format.style.page_height_mm;
  const pdf = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight], compress: true });
  const margin = format.style.margins;
  const left = margin.left_cm * 10;
  const right = margin.right_cm * 10;
  const top = margin.top_cm * 10;
  const bottom = margin.bottom_cm * 10;
  const contentWidth = pageWidth - left - right;
  const font = pdfFont(format.style.font_family);
  const bodySize = format.style.body_font_size_pt;
  let y = top;

  function nextPageIfNeeded(height: number) {
    if (y + height <= pageHeight - bottom) return;
    pdf.addPage();
    y = top;
  }

  function addText(text: string, size: number, lineHeight: number, bold = false, alignment: "left" | "center" | "right" = "left") {
    pdf.setFont(font, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text || " ", contentWidth) as string[];
    const x = alignment === "center" ? left + contentWidth / 2 : alignment === "right" ? pageWidth - right : left;
    for (const line of lines) { nextPageIfNeeded(lineHeight); pdf.text(line, x, y, { align: alignment }); y += lineHeight; }
  }

  async function addPhotos() {
    for (const photo of photos) {
      const ratio = photo.width / photo.height;
      const width = Math.min(contentWidth, 125 * ratio);
      const height = width / ratio;
      nextPageIfNeeded(height + 19);
      pdf.addImage(await photoDataUrl(photo.blob), "JPEG", left + (contentWidth - width) / 2, y, width, height);
      y += height + 6;
      addText(photo.caption ?? photo.name, Math.max(8, bodySize - 2), 5, false, "center");
      y += 8;
    }
  }

  addText(content.title, bodySize + 5, 9, true, format.style.heading_alignment);
  y += 4;
  let photosPlaced = false;
  for (const section of content.sections) {
    const rule = format.sections.find((candidate) => candidate.key === section.key);
    if (rule?.page_break_before && y > top) { pdf.addPage(); y = top; }
    nextPageIfNeeded(20);
    addText(section.title, bodySize + Math.max(1, 4 - (rule?.heading_level ?? 1)), 7, true, format.style.heading_alignment);
    y += 2;
    for (const block of section.blocks) {
      const text = block.items.length ? block.items.join("\n") : block.text;
      if (!text.trim()) continue;
      const paragraphs = rule?.content_type === "bullets" || rule?.content_type === "numbered_list"
        ? text.split(/\n+/).map((item) => item.trim()).filter(Boolean) : [text];
      for (const [index, paragraph] of paragraphs.entries()) {
        const prefix = rule?.content_type === "bullets" ? "- " : rule?.content_type === "numbered_list" ? `${index + 1}. ` : "";
        addText(`${prefix}${paragraph}`, bodySize, 5.5);
        y += 3;
      }
    }
    if (photos.length && section.key === format.images.heading_key) { await addPhotos(); photosPlaced = true; }
    y += 3;
  }
  if (photos.length && !photosPlaced) {
    pdf.addPage(); y = top;
    addText("Photographs", bodySize + 3, 8, true, format.style.heading_alignment);
    y += 5;
    await addPhotos();
  }
  return pdf.output("blob");
}
