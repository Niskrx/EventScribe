import assert from "node:assert/strict";
import { test } from "node:test";

import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

import { analyzeReferenceFile, analyzeTextFormat } from "../lib/presentation-format.ts";
import { presentationContent } from "../lib/presentation-report.ts";
import { presentationDocx, presentationPdf } from "../lib/presentation-export.ts";

const event = {
  title: "Campus Workshop", event_date: "2026-11-19", department: "Computer Science",
  venue: "Seminar Hall", coordinator: "Dr. Rao", objectives: "Learn practical AI tools",
  activities: "Demonstrations and discussions", outcomes: "Participants built prototypes",
};

async function docxReference(headings) {
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: "Event Report Format", heading: HeadingLevel.TITLE }),
    ...headings.flatMap((heading) => [
      new Paragraph({ text: heading, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "Sample text belonging to an earlier event." }),
    ]),
  ] }] });
  return new File([await Packer.toBuffer(document)], "reference.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function pdfReference(headings) {
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text("Event Report Format", 20, 25);
  for (const [index, heading] of headings.entries()) {
    const y = 45 + index * 28;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.text(heading, 20, y);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
    pdf.text("Sample text belonging to an earlier event and describing its details.", 20, y + 10);
  }
  return new File([pdf.output("arraybuffer")], "reference.pdf", { type: "application/pdf" });
}

test("different DOCX references produce different ordered sections and facts", async () => {
  const first = await analyzeReferenceFile(await docxReference(["Event Overview", "Objectives", "Photographs"]));
  const second = await analyzeReferenceFile(await docxReference(["Programme Summary", "Learning Outcomes", "Faculty Signatures"]));
  assert.deepEqual(first.sections.map((section) => section.title), ["Event Overview", "Objectives", "Photographs"]);
  assert.deepEqual(second.sections.map((section) => section.title), ["Programme Summary", "Learning Outcomes", "Faculty Signatures"]);
  const report = presentationContent(event, second);
  assert.deepEqual(report.sections.map((section) => section.title), second.sections.map((section) => section.title));
  assert.equal(report.sections[0].blocks[0].text, event.activities);
  assert.equal(report.sections[1].blocks[0].text, event.outcomes);
  assert.deepEqual(report.missing_facts, ["Faculty Signatures"]);
});

test("PDF headings are read from the supplied file and image-only PDFs are rejected", async () => {
  const first = await analyzeReferenceFile(pdfReference(["Event Overview", "Objectives"]));
  const second = await analyzeReferenceFile(pdfReference(["Activities", "Outcomes", "Photographs"]));
  assert.deepEqual(first.sections.map((section) => section.title), ["Event Overview", "Objectives"]);
  assert.deepEqual(second.sections.map((section) => section.title), ["Activities", "Outcomes", "Photographs"]);
  const empty = new jsPDF();
  await assert.rejects(analyzeReferenceFile(new File([empty.output("arraybuffer")], "scanned.pdf")), /no selectable text/);
});

test("written format and exports retain supplied section order", async () => {
  const format = analyzeTextFormat("Sections: Event Overview, Objectives, Photographs");
  const report = presentationContent(event, format);
  const docx = await presentationDocx(report, [], format);
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.indexOf("Event Overview") < xml.indexOf("Objectives"));
  assert.ok(xml.indexOf("Objectives") < xml.indexOf("Photographs"));
  assert.ok(xml.includes("Learn practical AI tools"));
  const pdf = await presentationPdf(report, [], format);
  assert.equal((await pdf.slice(0, 4).text()), "%PDF");
});
