import type { jsPDF } from "jspdf";
import {
  createPortraitPdf,
  downloadPdfDocument,
  drawPdfWatermark,
} from "@/lib/pdf/analyticsReportPdf";

/** Anti-Scam PH brand (matches design-tokens) */
const BRAND = {
  navy: [13, 30, 66] as [number, number, number],
  crimson: [204, 27, 46] as [number, number, number],
  gold: [245, 184, 0] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [15, 23, 42] as [number, number, number],
};

const OPC_FOOTER = "Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.";
const TAGLINE = "Stay informed. Stay protected. Don't get scammed.";

let logoCache: string | null | undefined;

/** Shared logo loader for all dashboard PDF exports. */
export async function loadBrandLogoDataUrlForPdf(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const res = await fetch("/branding/mainlogo.png", { cache: "force-cache" });
    if (!res.ok) return (logoCache = null);
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoCache;
  } catch {
    logoCache = null;
    return null;
  }
}

export type BrandedPdfSession = {
  doc: jsPDF;
  logoDataUrl: string | null;
  reportLabel: string;
  left: number;
  right: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
  y: number;
  pageNum: number;
};

function drawPageFooter(sess: BrandedPdfSession): void {
  const { doc, pageWidth, pageHeight, left, right, pageNum, reportLabel } = sess;
  const barH = 14;

  doc.setFillColor(...BRAND.navy);
  doc.rect(0, pageHeight - barH, pageWidth, barH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.white);
  doc.text(`Anti-Scam PH · ${reportLabel}`, left, pageHeight - 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text(TAGLINE, pageWidth / 2, pageHeight - 8.5, { align: "center" });

  doc.setFontSize(7);
  doc.text(`Page ${pageNum}`, right, pageHeight - 8.5, { align: "right" });

  doc.setTextColor(...BRAND.slate);
  doc.setFontSize(5.8);
  const disclaimer = doc.splitTextToSize(OPC_FOOTER, contentWidth(sess));
  doc.text(disclaimer, left, pageHeight - 4.2);
}

function contentWidth(sess: BrandedPdfSession): number {
  return sess.right - sess.left;
}

function drawMiniHeader(sess: BrandedPdfSession): number {
  const { doc, left, right, logoDataUrl } = sess;
  const y = 10;
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, sess.pageWidth, 22, "F");
  doc.setFillColor(...BRAND.crimson);
  doc.rect(0, 22, sess.pageWidth, 0.8, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", left, 4, 14, 14);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.white);
  doc.text("ANTI-SCAM PH", logoDataUrl ? left + 17 : left, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(sess.reportLabel, right, 11, { align: "right" });
  drawPdfWatermark(sess.doc);
  return 28;
}

export async function beginBrandedPdf(
  reportLabel: string,
  opts: { title: string; subtitle: string; metaLines: string[] },
): Promise<BrandedPdfSession> {
  const doc = createPortraitPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  const logoDataUrl = await loadBrandLogoDataUrlForPdf();

  const sess: BrandedPdfSession = {
    doc,
    logoDataUrl,
    reportLabel,
    left,
    right,
    contentWidth: right - left,
    pageWidth,
    pageHeight,
    y: 10,
    pageNum: 1,
  };

  // Full branded header block
  const headerH = 38;
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(...BRAND.crimson);
  doc.rect(0, headerH, pageWidth, 1.2, "F");
  doc.setFillColor(...BRAND.gold);
  doc.rect(0, headerH + 1.2, pageWidth, 0.5, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", left, 6, 22, 22);
  }

  const textX = logoDataUrl ? left + 26 : left;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.white);
  doc.text("ANTI-SCAM PH", textX, 14);
  doc.setFontSize(12);
  doc.text(opts.title, textX, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 230, 245);
  doc.text(opts.subtitle, textX, 28);

  let metaY = 12;
  doc.setFontSize(8);
  for (const line of opts.metaLines) {
    doc.text(line, right, metaY, { align: "right", maxWidth: 72 });
    metaY += 5;
  }

  sess.y = headerH + 10;
  drawPdfWatermark(doc);
  return sess;
}

export function ensureBrandedSpace(sess: BrandedPdfSession, needed: number): BrandedPdfSession {
  if (sess.y + needed <= sess.pageHeight - 20) return sess;
  drawPageFooter(sess);
  sess.doc.addPage();
  sess.pageNum += 1;
  sess.y = drawMiniHeader(sess);
  return sess;
}

export function drawBrandedSection(sess: BrandedPdfSession, title: string): BrandedPdfSession {
  const next = ensureBrandedSpace(sess, 12);
  const { doc, left } = next;
  doc.setFillColor(...BRAND.crimson);
  doc.rect(left, next.y, 3, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(title, left + 6, next.y + 5);
  next.y += 12;
  return next;
}

export function drawBrandedKpiRow(
  sess: BrandedPdfSession,
  items: { label: string; value: string; hint?: string }[],
): BrandedPdfSession {
  const cols = Math.min(items.length, 2);
  const gap = 4;
  const cardW = (sess.contentWidth - gap * (cols - 1)) / cols;
  const cardH = 18;
  const next = ensureBrandedSpace(sess, cardH + 4);

  items.slice(0, 4).forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = next.left + col * (cardW + gap);
    const y = next.y + row * (cardH + gap);

    next.doc.setFillColor(...BRAND.panel);
    next.doc.setDrawColor(...BRAND.line);
    next.doc.setLineWidth(0.2);
    next.doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    next.doc.setFont("helvetica", "normal");
    next.doc.setFontSize(7.5);
    next.doc.setTextColor(...BRAND.slate);
    next.doc.text(item.label, x + 3, y + 6, { maxWidth: cardW - 6 });

    next.doc.setFont("helvetica", "bold");
    next.doc.setFontSize(11);
    next.doc.setTextColor(...BRAND.navy);
    next.doc.text(item.value, x + 3, y + 13, { maxWidth: cardW - 6 });

    if (item.hint) {
      next.doc.setFont("helvetica", "normal");
      next.doc.setFontSize(6.5);
      next.doc.setTextColor(...BRAND.slate);
      next.doc.text(item.hint, x + 3, y + 16.5, { maxWidth: cardW - 6 });
    }
  });

  const rows = Math.ceil(Math.min(items.length, 4) / cols);
  next.y += rows * (cardH + gap) + 2;
  return next;
}

export function drawBrandedLine(sess: BrandedPdfSession, text: string, bold = false): BrandedPdfSession {
  const next = ensureBrandedSpace(sess, 7);
  next.doc.setFont("helvetica", bold ? "bold" : "normal");
  next.doc.setFontSize(9);
  next.doc.setTextColor(...BRAND.black);
  const lines = next.doc.splitTextToSize(text, next.contentWidth);
  for (const line of lines) {
    const spaced = ensureBrandedSpace(next, 6);
    spaced.doc.text(line, spaced.left, spaced.y);
    spaced.y += 5.5;
  }
  return next;
}

export function drawBrandedTable(
  sess: BrandedPdfSession,
  headers: string[],
  rows: string[][],
): BrandedPdfSession {
  let next = sess;
  const colCount = headers.length;
  const colW = next.contentWidth / colCount;
  const rowH = 7;

  const drawHeader = () => {
    next.doc.setFillColor(...BRAND.navy);
    next.doc.rect(next.left, next.y, next.contentWidth, rowH, "F");
    next.doc.setFont("helvetica", "bold");
    next.doc.setFontSize(8);
    next.doc.setTextColor(...BRAND.white);
    headers.forEach((h, i) => {
      next.doc.text(h, next.left + i * colW + 2, next.y + 4.8, { maxWidth: colW - 4 });
    });
    next.y += rowH;
  };

  next = ensureBrandedSpace(next, rowH * 2);
  drawHeader();

  rows.forEach((row, ri) => {
    next = ensureBrandedSpace(next, rowH);
    if (ri % 2 === 0) {
      next.doc.setFillColor(...BRAND.panel);
      next.doc.rect(next.left, next.y, next.contentWidth, rowH, "F");
    }
    next.doc.setFont("helvetica", "normal");
    next.doc.setFontSize(8);
    next.doc.setTextColor(...BRAND.black);
    row.forEach((cell, ci) => {
      next.doc.text(cell, next.left + ci * colW + 2, next.y + 4.8, { maxWidth: colW - 4 });
    });
    next.y += rowH;
  });

  next.y += 4;
  return next;
}

export function finishBrandedPdf(sess: BrandedPdfSession, fileName: string, openPreview = true): void {
  drawPageFooter(sess);
  downloadPdfDocument(sess.doc, fileName, openPreview);
}
