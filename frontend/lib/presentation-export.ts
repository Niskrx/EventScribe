import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

import type { ReportContent } from "@/lib/api";
import type { ReportPhoto } from "@/lib/presentation-photos";

async function photoDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16_384) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16_384));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

export async function presentationDocx(content: ReportContent, photos: ReportPhoto[]): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: "center",
      spacing: { after: 320 },
      children: [new TextRun({ text: content.title, bold: true, size: 32 })],
    }),
  ];

  for (const section of content.sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
    for (const block of section.blocks) {
      if (block.items.length) {
        for (const item of block.items) {
          children.push(new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 120 } }));
        }
      } else {
        children.push(new Paragraph({ text: block.text, spacing: { after: 180 } }));
      }
    }
  }

  if (photos.length) {
    children.push(new Paragraph({ text: "Photographs", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    for (const photo of photos) {
      const width = Math.min(480, photo.width, 620 * photo.width / photo.height);
      const height = Math.max(1, Math.round(width * photo.height / photo.width));
      children.push(new Paragraph({
        alignment: "center",
        spacing: { before: 200, after: 80 },
        children: [new ImageRun({
          type: "jpg",
          data: new Uint8Array(await photo.blob.arrayBuffer()),
          transformation: { width, height },
          altText: { title: photo.name, description: photo.caption ?? photo.name },
        })],
      }));
      children.push(new Paragraph({ text: photo.caption ?? photo.name, alignment: "center", spacing: { after: 240 } }));
    }
  }

  const document = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(document);
}

export async function presentationPdf(content: ReportContent, photos: ReportPhoto[]): Promise<Blob> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 22;

  function nextPageIfNeeded(height: number) {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = 22;
  }

  function addText(text: string, size: number, lineHeight: number, bold = false) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text || " ", contentWidth) as string[];
    for (const line of lines) {
      nextPageIfNeeded(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  }

  addText(content.title, 18, 9, true);
  y += 4;
  for (const section of content.sections) {
    nextPageIfNeeded(20);
    addText(section.title, 13, 7, true);
    y += 2;
    for (const block of section.blocks) {
      const paragraphs = block.items.length ? block.items.map((item) => `- ${item}`) : [block.text];
      for (const paragraph of paragraphs) {
        addText(paragraph, 10, 5.5);
        y += 3;
      }
    }
    y += 3;
  }

  if (photos.length) {
    pdf.addPage();
    y = 22;
    addText("Photographs", 15, 9, true);
    y += 5;
    for (const photo of photos) {
      const ratio = photo.width / photo.height;
      const width = Math.min(contentWidth, 125 * ratio);
      const height = width / ratio;
      nextPageIfNeeded(height + 19);
      pdf.addImage(await photoDataUrl(photo.blob), "JPEG", margin + (contentWidth - width) / 2, y, width, height);
      y += height + 6;
      addText(photo.caption ?? photo.name, 9, 5);
      y += 8;
    }
  }

  return pdf.output("blob");
}
