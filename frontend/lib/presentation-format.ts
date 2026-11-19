import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type FormatSection = {
  key: string;
  title: string;
  order: number;
  content_type: "paragraphs" | "bullets" | "numbered_list" | "table";
  heading_level: number;
  page_break_before?: boolean;
  tables?: FormatTable[];
};

export type FormatTable = {
  columns: string[];
  row_labels: string[];
  column_count: number;
  row_count: number;
  purpose: "data" | "choices" | "images";
};

export type PresentationFormat = {
  schema_version: "1.0";
  source_type: "pdf" | "docx" | "text";
  source_name: string;
  sections: FormatSection[];
  document_title?: string;
  institution_lines?: string[];
  style: {
    font_family: string;
    body_font_size_pt: number;
    heading_alignment: "left" | "center" | "right";
    body_alignment: "left" | "center" | "right" | "justify";
    margins: { top_cm: number; right_cm: number; bottom_cm: number; left_cm: number };
    page_width_mm: number;
    page_height_mm: number;
  };
  images: { mode: "appendix" | "inline"; heading_key: string | null; columns?: number };
  uncertainties: string[];
};

type XmlNode = Record<string, unknown>;
type Candidate = { title: string; level?: number; kind?: FormatSection["content_type"]; pageBreak?: boolean; tables?: FormatTable[] };

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  trimValues: false,
  processEntities: false,
});

function nodeChildren(nodes: XmlNode[], tag: string): XmlNode[] {
  return nodes.flatMap((node) => Array.isArray(node[tag]) ? node[tag] as XmlNode[] : []);
}

function firstNode(nodes: XmlNode[], tag: string): XmlNode | undefined {
  return nodes.find((node) => tag in node);
}

function attribute(node: XmlNode | undefined, name: string): string | undefined {
  const attrs = node?.[":@"];
  if (!attrs || typeof attrs !== "object") return undefined;
  const value = (attrs as Record<string, unknown>)[`@${name}`];
  return typeof value === "string" ? value : undefined;
}

function nested(nodes: XmlNode[], ...tags: string[]): XmlNode[] {
  return tags.reduce((current, tag) => nodeChildren(current, tag), nodes);
}

function textIn(nodes: XmlNode[]): string {
  return nodes.map((node) => {
    if ("w:t" in node) return String((node["w:t"] as XmlNode[])?.[0]?.["#text"] ?? "");
    if ("w:tab" in node) return " ";
    if ("w:br" in node) return "\n";
    const child = Object.entries(node).find(([key]) => key !== ":@" && key !== "#text")?.[1];
    return Array.isArray(child) ? textIn(child as XmlNode[]) : "";
  }).join("");
}

function normalizeTitle(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  })[entity] ?? entity).replace(/\s+/g, " ").replace(/^[•\-–]\s*/, "").trim();
}

function isHeadingText(value: string): boolean {
  const text = normalizeTitle(value);
  return text.length >= 3 && text.length <= 200 && !/\.{3,}/.test(text) && !/^\d+$/.test(text);
}

function sectionsFromCandidates(candidates: Candidate[], source: PresentationFormat["source_type"]): FormatSection[] {
  const seen = new Set<string>();
  const sections: FormatSection[] = [];
  for (const candidate of candidates) {
    const title = normalizeTitle(candidate.title);
    const canonical = title.toLocaleLowerCase();
    if (!isHeadingText(title) || seen.has(canonical)) continue;
    seen.add(canonical);
    sections.push({
      key: `section_${sections.length + 1}`,
      title,
      order: sections.length + 1,
      content_type: candidate.kind ?? "paragraphs",
      heading_level: Math.min(6, Math.max(1, candidate.level ?? 1)),
      page_break_before: candidate.pageBreak ?? false,
      tables: candidate.tables,
    });
  }
  if (!sections.length) {
    throw new Error(`No section headings could be identified in this ${source.toUpperCase()} reference. Use a selectable-text file or list the required headings in the format description.`);
  }
  return sections.slice(0, 50);
}

function photoHeadingKey(sections: FormatSection[]): string | null {
  return sections.find((section) => /\b(photo(graphs?)?|images?|gallery|pictur(es|es?))\b/i.test(section.title))?.key ?? null;
}

function baseFormat(source_type: PresentationFormat["source_type"], source_name: string, sections: FormatSection[]): PresentationFormat {
  return {
    schema_version: "1.0",
    source_type,
    source_name,
    sections,
    style: {
      font_family: "Times New Roman",
      body_font_size_pt: 12,
      heading_alignment: "left",
      body_alignment: "justify",
      margins: { top_cm: 2.54, right_cm: 2.54, bottom_cm: 2.54, left_cm: 2.54 },
      page_width_mm: 210,
      page_height_mm: 297,
    },
    images: { mode: "appendix", heading_key: photoHeadingKey(sections) },
    uncertainties: [],
  };
}

function headingLevel(style: string): number | null {
  const match = style.match(/heading\s*([1-6])/i);
  return match ? Number(match[1]) : null;
}

function tableShape(nodes: XmlNode[]): FormatTable | null {
  const rows = nodes.filter((node) => "w:tr" in node).map((node) => node["w:tr"] as XmlNode[]);
  if (!rows.length) return null;
  const cells = rows.map((row) => row.filter((node) => "w:tc" in node).map((node) => node["w:tc"] as XmlNode[]));
  const columnCount = Math.max(...cells.map((row) => row.length));
  const hasImages = rows.some((row) => JSON.stringify(row).includes('"w:drawing"'));
  const firstRow = cells[0].map((cell) => normalizeTitle(textIn(cell)));
  const isChoices = cells.flat().filter((cell) => !normalizeTitle(textIn(cell))).length > cells.flat().length / 4;
  const columns = hasImages ? [] : firstRow.map((value) => value === "√" ? "" : value);
  const rowLabels = hasImages || /\b(time|date|s\.?no\.?|serial)\b/i.test(firstRow[0] ?? "")
    ? []
    : cells.slice(1).map((row) => normalizeTitle(textIn(row[0] ?? [])))
      .filter((value) => value && value.length < 55 && !/^\d+$/.test(value));
  return { columns, row_labels: rowLabels, column_count: columnCount,
    row_count: cells.length, purpose: hasImages ? "images" : isChoices ? "choices" : "data" };
}

async function extractDocx(file: File): Promise<PresentationFormat> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("This DOCX does not contain readable document content.");
  const documentNodes = xmlParser.parse(documentXml) as XmlNode[];
  const body = nested(documentNodes, "w:document", "w:body");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const styles = stylesXml ? xmlParser.parse(stylesXml) as XmlNode[] : [];
  const numberingXml = await zip.file("word/numbering.xml")?.async("string");
  const numbering = numberingXml ? xmlParser.parse(numberingXml) as XmlNode[] : [];
  const abstractIds = new Map<string, string>();
  const numberingFormats = new Map<string, Map<string, string>>();
  for (const entry of nested(numbering, "w:numbering")) {
    if ("w:num" in entry) {
      const id = attribute(entry, "w:numId");
      const abstract = attribute(firstNode(entry["w:num"] as XmlNode[], "w:abstractNumId"), "w:val");
      if (id && abstract) abstractIds.set(id, abstract);
    } else if ("w:abstractNum" in entry) {
      const id = attribute(entry, "w:abstractNumId");
      if (!id) continue;
      const levels = new Map<string, string>();
      for (const level of (entry["w:abstractNum"] as XmlNode[]).filter((node) => "w:lvl" in node)) {
        const index = attribute(level, "w:ilvl") ?? "0";
        const fmt = attribute(firstNode(level["w:lvl"] as XmlNode[], "w:numFmt"), "w:val") ?? "decimal";
        levels.set(index, fmt);
      }
      numberingFormats.set(id, levels);
    }
  }
  const counters = new Map<string, number>();
  function numberingPrefix(properties: XmlNode[]): string {
    const num = nodeChildren(properties, "w:numPr");
    const id = attribute(firstNode(num, "w:numId"), "w:val") ?? "0";
    const level = attribute(firstNode(num, "w:ilvl"), "w:val") ?? "0";
    const counterKey = `${id}:${level}`;
    const count = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, count);
    const fmt = numberingFormats.get(abstractIds.get(id) ?? "")?.get(level) ?? "decimal";
    if (fmt === "lowerLetter") return `${String.fromCharCode(96 + ((count - 1) % 26) + 1)}.`;
    if (fmt === "upperLetter") return `${String.fromCharCode(64 + ((count - 1) % 26) + 1)}.`;
    return `${count}.`;
  }
  const styleMap = new Map<string, { name: string; basedOn: string; bold: boolean }>();
  for (const entry of nested(styles, "w:styles")) {
    if (!("w:style" in entry)) continue;
    const id = attribute(entry, "w:styleId");
    if (!id) continue;
    const parts = entry["w:style"] as XmlNode[];
    const runProps = nodeChildren(parts, "w:rPr");
    styleMap.set(id, {
      name: attribute(firstNode(parts, "w:name"), "w:val") ?? id,
      basedOn: attribute(firstNode(parts, "w:basedOn"), "w:val") ?? "",
      bold: Boolean(firstNode(runProps, "w:b")),
    });
  }
  const candidates: Candidate[] = [];
  const preamble: string[] = [];
  let paragraphCount = 0;
  let started = false;
  let alignment: PresentationFormat["style"]["heading_alignment"] = "left";
  const fontWeights = new Map<string, number>();
  const sizeWeights = new Map<number, number>();
  let lastTable: FormatTable | null = null;

  for (const element of body) {
    if ("w:p" in element) {
      const paragraph = element["w:p"] as XmlNode[];
      const text = normalizeTitle(textIn(paragraph));
      if (!text) continue;
      paragraphCount++;
      const pPr = nodeChildren(paragraph, "w:pPr");
      const style = attribute(firstNode(pPr, "w:pStyle"), "w:val") ?? "";
      const styleDefinition = styleMap.get(style);
      const parentStyle = styleMap.get(styleDefinition?.basedOn ?? "");
      const level = headingLevel(style) ?? headingLevel(styleDefinition?.name ?? "") ?? headingLevel(parentStyle?.name ?? "");
      const bold = Boolean(styleDefinition?.bold || parentStyle?.bold) || paragraph.some((run) => "w:r" in run && nodeChildren(run["w:r"] as XmlNode[], "w:rPr")
        .some((props) => "w:b" in props));
      const align = attribute(firstNode(pPr, "w:jc"), "w:val");
      const numbered = Boolean(firstNode(pPr, "w:numPr"));
      const explicitlyNumbered = /^(?:\d+[a-z]?\.|\d+\s*\([a-z]\)|\([a-z]\)|annexure\s+[ivx]+\s*:)/i.test(text);
      const isHeading = Boolean(level) || (bold && isHeadingText(text) && (numbered || explicitlyNumbered || /:\s*$/.test(text)));
      if (!started && !isHeading) { preamble.push(text); continue; }
      if (isHeading) {
        started = true;
        if (!candidates.length && (align === "center" || align === "right")) alignment = align;
        const title = numbered ? `${numberingPrefix(pPr)} ${text}` : text;
        const previous = candidates[candidates.length - 1];
        const movedTable = lastTable?.purpose === "choices" && lastTable.row_count === 1 && previous?.tables?.includes(lastTable)
          ? lastTable : null;
        if (movedTable && previous?.tables) {
          previous.tables = previous.tables.filter((table) => table !== movedTable);
          if (!previous.tables.length) previous.kind = "paragraphs";
        }
        candidates.push({
          title,
          level: level ?? 1,
          kind: movedTable ? "table" : "paragraphs",
          pageBreak: Boolean(firstNode(pPr, "w:pageBreakBefore")),
          tables: movedTable ? [movedTable] : undefined,
        });
        lastTable = null;
      } else {
        lastTable = null;
        for (const run of paragraph.filter((node) => "w:r" in node)) {
          const parts = run["w:r"] as XmlNode[];
          const runText = textIn(parts);
          if (!runText.trim()) continue;
          const props = nodeChildren(parts, "w:rPr");
          const font = attribute(firstNode(props, "w:rFonts"), "w:ascii");
          const size = Number(attribute(firstNode(props, "w:sz"), "w:val"));
          if (font) fontWeights.set(font, (fontWeights.get(font) ?? 0) + runText.length);
          if (size >= 12 && size <= 48) sizeWeights.set(size / 2, (sizeWeights.get(size / 2) ?? 0) + runText.length);
        }
      }
    } else if ("w:tbl" in element) {
      const table = tableShape(element["w:tbl"] as XmlNode[]);
      const owner = candidates[candidates.length - 1];
      if (table && owner) {
        if (table.columns.every((column) => /signature/i.test(column)) && table.columns.length > 0) {
          candidates.push({ title: "Signatures", kind: "table", tables: [table] });
          lastTable = null;
          continue;
        }
        owner.tables ??= [];
        owner.tables.push(table);
        if (table.purpose !== "images") owner.kind = "table";
        lastTable = table;
      }
    }
  }

  const sections = sectionsFromCandidates(candidates, "docx");
  const format = baseFormat("docx", file.name, sections);
  format.document_title = preamble.find((line) => /\b(report|format|template)\b/i.test(line) && line.length < 130);
  format.institution_lines = preamble.filter((line) => line !== format.document_title && line.length < 100
    && !/\bdate\s*:|\d{2}\/\d{2}\/\d{4}|_{3,}/i.test(line)).slice(0, 3);
  const imageTable = sections.flatMap((section) => section.tables ?? []).find((table) => table.purpose === "images");
  if (imageTable && format.images.heading_key) {
    format.images.mode = "inline";
    format.images.columns = Math.min(4, imageTable.column_count);
  }
  format.style.heading_alignment = alignment;
  if (stylesXml) {
    const defaults = nested(styles, "w:styles", "w:docDefaults", "w:rPrDefault", "w:rPr");
    const font = attribute(firstNode(defaults, "w:rFonts"), "w:ascii");
    const size = Number(attribute(firstNode(defaults, "w:sz"), "w:val"));
    if (font) format.style.font_family = font;
    if (size >= 12 && size <= 48) format.style.body_font_size_pt = size / 2;
  }
  const commonFont = [...fontWeights].sort((left, right) => right[1] - left[1])[0]?.[0];
  const commonSize = [...sizeWeights].sort((left, right) => right[1] - left[1])[0]?.[0];
  if (commonFont) format.style.font_family = commonFont;
  if (commonSize) format.style.body_font_size_pt = commonSize;
  const sectionProperties = firstNode(body, "w:sectPr");
  const sectionNodes = sectionProperties?.["w:sectPr"] as XmlNode[] | undefined;
  if (sectionNodes) {
    const margins = firstNode(sectionNodes, "w:pgMar");
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const twips = Number(attribute(margins, `w:${side}`));
      if (twips > 0 && twips < 10000) format.style.margins[`${side}_cm`] = Number((twips / 567).toFixed(2));
    }
    const page = firstNode(sectionNodes, "w:pgSz");
    const width = Number(attribute(page, "w:w"));
    const height = Number(attribute(page, "w:h"));
    if (width > 0 && height > 0) {
      format.style.page_width_mm = Number((width / 56.7).toFixed(1));
      format.style.page_height_mm = Number((height / 56.7).toFixed(1));
    }
  }
  if (paragraphCount === 0) format.uncertainties.push("The reference contains no normal paragraphs; check the detected table headings.");
  if (sections.some((section) => section.tables?.length)) {
    format.uncertainties.push("Tables from a filled reference provide structure only; example names, numbers, and answers are not reused.");
  }
  return format;
}

type PdfLine = { text: string; x: number; y: number; width: number; size: number; font: string; family: string; page: number; pageWidth: number };

async function extractPdf(file: File): Promise<PresentationFormat> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = typeof window === "undefined"
    ? new URL("../node_modules/pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
    : "/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const lines: PdfLine[] = [];
    let pageHeight = 297;
    let pageWidth = 210;
    for (let number = 1; number <= Math.min(document.numPages, 25); number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      if (number === 1) { pageWidth = viewport.width * 25.4 / 72; pageHeight = viewport.height * 25.4 / 72; }
      const content = await page.getTextContent();
      const items = content.items.filter((item): item is Extract<typeof item, { str: string }> => "str" in item && Boolean(item.str.trim()))
        .map((item) => ({
          text: item.str.trim(), x: item.transform[4], y: item.transform[5], width: item.width,
          size: Math.hypot(item.transform[0], item.transform[1]),
          font: item.fontName, family: content.styles[item.fontName]?.fontFamily ?? "",
        })).sort((a, b) => b.y - a.y || a.x - b.x);
      for (const item of items) {
        const last = lines[lines.length - 1];
        if (last && last.page === number && Math.abs(last.y - item.y) < Math.max(2, item.size * 0.25)) {
          const gap = item.x - (last.x + last.width);
          last.text += `${gap > item.size * 0.2 ? " " : ""}${item.text}`;
          last.width = Math.max(last.width, item.x + item.width - last.x);
          last.size = Math.max(last.size, item.size);
        } else {
          lines.push({ ...item, page: number, pageWidth: viewport.width });
        }
      }
    }
    if (!lines.length) throw new Error("This PDF has no selectable text. Upload a text-based PDF/DOCX or describe its headings manually; scanned pages need OCR.");
    const sizes = lines.flatMap((line) => Array(Math.min(12, Math.max(1, Math.round(line.text.length / 10)))).fill(line.size) as number[]).sort((a, b) => a - b);
    const bodySize = sizes[Math.floor(sizes.length / 2)] || 12;
    const fontWeights = new Map<string, number>();
    for (const line of lines) fontWeights.set(line.font, (fontWeights.get(line.font) ?? 0) + line.text.length);
    const bodyFont = [...fontWeights].sort((a, b) => b[1] - a[1])[0]?.[0];
    const candidates = lines.filter((line) => {
      const text = normalizeTitle(line.text);
      const bold = /bold|black|heavy|semibold/i.test(line.font);
      return isHeadingText(text) && (line.size >= bodySize + 1.5 || (bold && text.length < 90)
        || (line.font !== bodyFont && text.length < 90) || /:\s*$/.test(text));
    });
    if (candidates.length > 1 && candidates[0].page === 1 && candidates[0].size >= bodySize * 1.3 && /\b(report|format|template)\b/i.test(candidates[0].text)) {
      candidates.shift();
    }
    const sections = sectionsFromCandidates(candidates.map((line) => ({ title: line.text })), "pdf");
    const format = baseFormat("pdf", file.name, sections);
    format.style.page_width_mm = Number(pageWidth.toFixed(1));
    format.style.page_height_mm = Number(pageHeight.toFixed(1));
    format.style.body_font_size_pt = Math.max(8, Math.min(20, Math.round(bodySize)));
    const bodyLine = lines.find((line) => Math.abs(line.size - bodySize) < 0.5 && line.family);
    if (bodyLine) format.style.font_family = bodyLine.family;
    const firstHeading = candidates[0];
    if (firstHeading && Math.abs(firstHeading.x - (firstHeading.pageWidth - firstHeading.width) / 2) < 24) format.style.heading_alignment = "center";
    format.uncertainties.push("PDF section structure and typography are estimated from selectable text; review the detected headings before export.");
    return format;
  } finally {
    await loading.destroy();
  }
}

export function analyzeTextFormat(description: string, name = "Written format"): PresentationFormat {
  const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates: Candidate[] = [];
  for (const line of lines) {
    const ordered = line.match(/^(?:\d+[.)]|[-*•])\s+(.+)$/);
    if (ordered) candidates.push({ title: ordered[1] });
    else if (/^(?:sections?|headings?)\s*:/i.test(line)) {
      for (const title of line.replace(/^[^:]+:/, "").split(/[,;→>]/)) candidates.push({ title });
    } else if (lines.length > 1 && isHeadingText(line) && !/^(?:use|write|include|make|font|margin|page|image|photo)\b/i.test(line)) {
      candidates.push({ title: line });
    }
  }
  const sections = sectionsFromCandidates(candidates, "text");
  return baseFormat("text", name, sections);
}

export async function analyzeReferenceFile(file: File): Promise<PresentationFormat> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Reference files must be smaller than 10 MB.");
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".docx")) return await extractDocx(file);
    if (name.endsWith(".pdf")) return await extractPdf(file);
  } catch (error) {
    if (error instanceof Error && /No section headings|no selectable text|does not contain readable/.test(error.message)) throw error;
    throw new Error(`Could not analyze ${file.name}. Please use a valid, selectable-text PDF or DOCX.`, { cause: error });
  }
  throw new Error("Only PDF and DOCX reference files are supported.");
}

export function asPresentationFormat(value: Record<string, unknown> | null): PresentationFormat | null {
  if (!value || value.schema_version !== "1.0" || !Array.isArray(value.sections) || !value.style) return null;
  return value as PresentationFormat;
}
