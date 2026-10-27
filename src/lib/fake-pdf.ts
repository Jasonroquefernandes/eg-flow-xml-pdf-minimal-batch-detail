const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const BODY_FONT_SIZE = 9;
const LINE_HEIGHT = 12;
const MAX_CHARS_PER_LINE = 92;
const MAX_TOTAL_LINES = 600;
const HEADER_HEIGHT = 70;
const LINES_PER_PAGE = Math.floor(
  (PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT) / LINE_HEIGHT,
);

// Transliterate common accented characters so every string stays strict
// ASCII — the hand-rolled PDF writer below measures byte offsets using
// JS string length, which only matches UTF-8 byte length for ASCII text.
const TRANSLITERATIONS: Record<string, string> = {
  æ: "ae",
  Æ: "AE",
  ø: "o",
  Ø: "O",
  å: "aa",
  Å: "AA",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  É: "E",
  È: "E",
  á: "a",
  à: "a",
  â: "a",
  ä: "a",
  Á: "A",
  À: "A",
  Ä: "A",
  ó: "o",
  ò: "o",
  ô: "o",
  ö: "o",
  Ó: "O",
  Ö: "O",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  Ü: "U",
  ñ: "n",
  Ñ: "N",
  ç: "c",
  Ç: "C",
};

function toAsciiSafe(text: string): string {
  return text
    .split("")
    .map((ch) => {
      if (ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7e) return ch;
      return TRANSLITERATIONS[ch] ?? "?";
    })
    .join("");
}

function escapePdfText(text: string): string {
  return toAsciiSafe(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += maxChars) {
    chunks.push(line.slice(i, i + maxChars));
  }
  return chunks;
}

function buildLines(xmlContent: string): {
  lines: string[];
  truncated: boolean;
} {
  const rawLines = xmlContent.replace(/\r\n/g, "\n").split("\n");
  const wrapped: string[] = [];
  for (const raw of rawLines) {
    wrapped.push(...wrapLine(raw.length ? raw : " ", MAX_CHARS_PER_LINE));
    if (wrapped.length > MAX_TOTAL_LINES) break;
  }
  const truncated = wrapped.length > MAX_TOTAL_LINES;
  return { lines: wrapped.slice(0, MAX_TOTAL_LINES), truncated };
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length > 0 ? pages : [[]];
}

// Renders the actual (transliterated, paginated) XML source as a monospace
// code listing inside a minimal hand-rolled PDF — a real, valid PDF file,
// not a stock placeholder page.
export function buildPlaceholderPdf(
  sourceFileName: string,
  xmlContent: string,
): Blob {
  const { lines, truncated } = buildLines(xmlContent);
  const pageLineChunks = chunk(lines, LINES_PER_PAGE);
  const pageCount = pageLineChunks.length;
  const generatedAt = new Date().toLocaleString();

  // Object numbering: 1=Catalog, 2=Pages, 3=Font(Helvetica), 4=Font(Courier),
  // then one Page object and one Content-stream object per page.
  const CATALOG = 1;
  const PAGES = 2;
  const FONT_HEADER = 3;
  const FONT_BODY = 4;
  const firstPageObj = 5;
  const firstContentObj = firstPageObj + pageCount;

  const pageObjNums = Array.from(
    { length: pageCount },
    (_, i) => firstPageObj + i,
  );
  const contentObjNums = Array.from(
    { length: pageCount },
    (_, i) => firstContentObj + i,
  );

  const objects: string[] = [];
  objects[CATALOG - 1] = `<< /Type /Catalog /Pages ${PAGES} 0 R >>`;
  objects[PAGES - 1] =
    `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  objects[FONT_HEADER - 1] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[FONT_BODY - 1] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  pageLineChunks.forEach((pageLines, i) => {
    const pageNum = i + 1;
    const pageObj = pageObjNums[i];
    const contentObj = contentObjNums[i];

    objects[pageObj - 1] =
      `<< /Type /Page /Parent ${PAGES} 0 R /Resources << /Font << /F1 ${FONT_HEADER} 0 R /F2 ${FONT_BODY} 0 R >> >> /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObj} 0 R >>`;

    const titleY = PAGE_HEIGHT - MARGIN;
    const subtitleY = titleY - 18;
    const bodyStartY = titleY - HEADER_HEIGHT;

    const headerStream = [
      "BT",
      `/F1 13 Tf 1 0 0 1 ${MARGIN} ${titleY} Tm (${escapePdfText(sourceFileName)}) Tj`,
      `/F1 8 Tf 1 0 0 1 ${MARGIN} ${subtitleY} Tm (converted ${escapePdfText(generatedAt)} - page ${pageNum} of ${pageCount}) Tj`,
      "ET",
    ].join("\n");

    const bodyRows = pageLines
      .map((line) => `(${escapePdfText(line)}) Tj 0 ${-LINE_HEIGHT} Td`)
      .join("\n");

    const bodyStream = [
      "BT",
      `/F2 ${BODY_FONT_SIZE} Tf`,
      `1 0 0 1 ${MARGIN} ${bodyStartY} Tm`,
      bodyRows,
      "ET",
    ].join("\n");

    const truncatedNotice =
      truncated && pageNum === pageCount
        ? `BT /F1 8 Tf 1 0 0 1 ${MARGIN} ${MARGIN - 10} Tm (... truncated, output exceeds preview length ...) Tj ET`
        : "";

    const streamContent = [headerStream, bodyStream, truncatedNotice]
      .filter(Boolean)
      .join("\n");

    objects[contentObj - 1] =
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${CATALOG} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
