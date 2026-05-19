import type {
  ResortRevenueAnalyticsPayload,
  ResortRevenueFilters,
} from "@/lib/api/dashboard";
import { formatPhpForPdf } from "@/lib/formatPhp";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { createPortraitPdf, downloadPdfDocument } from "@/lib/pdf/analyticsReportPdf";
import { loadBrandLogoDataUrlForPdf, type BrandedPdfSession } from "@/lib/pdf/brandedAnalyticsPdf";
import type { jsPDF } from "jspdf";

const BRAND = {
  navy: [13, 30, 66] as [number, number, number],
  crimson: [204, 27, 46] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [15, 23, 42] as [number, number, number],
};

const OPC_LINE = "Report generated via Anti-Scam PH · The Rising 2 Brothers OPC";

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function periodLabel(applied: ResortRevenueFilters): string {
  const p = applied.period ?? "monthly";
  if (p === "weekly" && applied.week) return `Week ${applied.week}, ${applied.year}`;
  if (p === "monthly" && applied.month) {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${months[(applied.month as number) - 1] ?? ""} ${applied.year}`;
  }
  if (p === "custom" && applied.from && applied.to) return `${applied.from} → ${applied.to}`;
  return `${p.toUpperCase()} · ${applied.year}`;
}

function drawSubtlePlatformWatermark(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  doc.saveGraphicsState();
  doc.setTextColor(235, 238, 245);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Anti-Scam PH", pageWidth / 2, pageHeight / 2, { angle: 32, align: "center" });
  doc.restoreGraphicsState();
}

function drawResortPageFooter(sess: BrandedPdfSession, resortName: string): void {
  const { doc, pageWidth, pageHeight, left, right, pageNum } = sess;
  const barH = 12;

  doc.setDrawColor(...BRAND.line);
  doc.setLineWidth(0.3);
  doc.line(left, pageHeight - barH - 2, right, pageHeight - barH - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.navy);
  doc.text(`${resortName} · Revenue & Analytics`, left, pageHeight - 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.slate);
  doc.text("Verified resort report on Anti-Scam PH", pageWidth / 2, pageHeight - 7, { align: "center" });
  doc.text(`Page ${pageNum}`, right, pageHeight - 7, { align: "right" });

  doc.setFontSize(5.5);
  doc.text(OPC_LINE, pageWidth / 2, pageHeight - 3.5, { align: "center" });
}

function drawResortContinuationHeader(
  sess: BrandedPdfSession,
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
): number {
  const { doc, left, right, pageWidth } = sess;

  doc.setFillColor(...BRAND.white);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setDrawColor(...BRAND.line);
  doc.setLineWidth(0.2);
  doc.line(left, 20, right, 20);
  doc.setFillColor(...BRAND.crimson);
  doc.rect(left, 20, right - left, 0.4, "F");

  if (resortLogo) {
    doc.addImage(resortLogo, "PNG", left, 3, 14, 14);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.navy);
  doc.text(resortName, resortLogo ? left + 17 : left, 10);

  if (platformLogo) {
    doc.addImage(platformLogo, "PNG", right - 10, 4, 8, 8);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...BRAND.slate);
  doc.text("Anti-Scam PH", right, 14, { align: "right" });

  drawSubtlePlatformWatermark(doc, pageWidth, sess.pageHeight);
  return 26;
}

function ensureResortSpace(
  sess: BrandedPdfSession,
  needed: number,
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
): BrandedPdfSession {
  if (sess.y + needed <= sess.pageHeight - 20) return sess;
  drawResortPageFooter(sess, resortName);
  sess.doc.addPage();
  sess.pageNum += 1;
  sess.y = drawResortContinuationHeader(sess, resortName, resortLogo, platformLogo);
  return sess;
}

async function beginResortRevenuePdf(
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
  metaLines: string[],
): Promise<BrandedPdfSession> {
  const doc = createPortraitPdf();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;

  const sess: BrandedPdfSession = {
    doc,
    logoDataUrl: resortLogo,
    reportLabel: "Revenue & Analytics",
    left,
    right,
    contentWidth: right - left,
    pageWidth,
    pageHeight,
    y: 0,
    pageNum: 1,
  };

  const headerH = 40;
  doc.setFillColor(...BRAND.white);
  doc.rect(0, 0, pageWidth, headerH, "F");
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, headerH, pageWidth, 0.6, "F");
  doc.setFillColor(...BRAND.crimson);
  doc.rect(0, headerH + 0.6, pageWidth, 0.35, "F");

  const logoSize = 26;
  if (resortLogo) {
    doc.setDrawColor(...BRAND.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(left, 7, logoSize, logoSize, 2, 2, "S");
    doc.addImage(resortLogo, "PNG", left + 1, 8, logoSize - 2, logoSize - 2);
  }

  const textX = resortLogo ? left + logoSize + 6 : left;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.navy);
  const nameLines = doc.splitTextToSize(resortName, right - textX - 36);
  doc.text(nameLines, textX, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.slate);
  doc.text("Revenue & Analytics Report", textX, 24);

  if (platformLogo) {
    doc.addImage(platformLogo, "PNG", right - 12, 8, 11, 11);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.slate);
  doc.text("Powered by", right, 21, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.crimson);
  doc.text("Anti-Scam PH", right, 25, { align: "right" });

  let metaY = 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.slate);
  for (const line of metaLines) {
    doc.text(line, right, metaY, { align: "right", maxWidth: 52 });
    metaY += 4.5;
  }

  sess.y = headerH + 8;
  drawSubtlePlatformWatermark(doc, pageWidth, pageHeight);
  return sess;
}

function resortDrawSection(
  sess: BrandedPdfSession,
  title: string,
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
): BrandedPdfSession {
  const next = ensureResortSpace(sess, 12, resortName, resortLogo, platformLogo);
  next.doc.setFillColor(...BRAND.crimson);
  next.doc.rect(next.left, next.y, 3, 7, "F");
  next.doc.setFont("helvetica", "bold");
  next.doc.setFontSize(11);
  next.doc.setTextColor(...BRAND.navy);
  next.doc.text(title, next.left + 6, next.y + 5);
  next.y += 12;
  return next;
}

function resortDrawKpi(
  sess: BrandedPdfSession,
  items: { label: string; value: string; hint?: string }[],
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
): BrandedPdfSession {
  const cols = Math.min(items.length, 2);
  const gap = 4;
  const cardW = (sess.contentWidth - gap * (cols - 1)) / cols;
  const cardH = 18;
  let next = ensureResortSpace(sess, cardH + 4, resortName, resortLogo, platformLogo);

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

function resortDrawTable(
  sess: BrandedPdfSession,
  headers: string[],
  rows: string[][],
  resortName: string,
  resortLogo: string | null,
  platformLogo: string | null,
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

  next = ensureResortSpace(next, rowH * 2, resortName, resortLogo, platformLogo);
  drawHeader();

  rows.forEach((row, ri) => {
    next = ensureResortSpace(next, rowH, resortName, resortLogo, platformLogo);
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

export async function exportResortRevenuePdf(
  payload: ResortRevenueAnalyticsPayload,
  applied: ResortRevenueFilters,
): Promise<void> {
  const resortName = payload.resort.name?.trim() || "Resort";
  const platformLogo = await loadBrandLogoDataUrlForPdf();
  let resortLogo: string | null = null;
  if (payload.resort.logo_url) {
    resortLogo = await loadImageDataUrl(laravelPublicUrl(payload.resort.logo_url));
  }

  const summary = payload.summary;
  const breakdown = Array.isArray(payload.series) ? payload.series : [];

  let sess = await beginResortRevenuePdf(resortName, resortLogo, platformLogo, [
    `Period: ${periodLabel(applied)}`,
    `Generated: ${new Date().toLocaleString("en-PH")}`,
  ]);

  sess = resortDrawSection(sess, "Performance summary", resortName, resortLogo, platformLogo);
  sess = resortDrawKpi(
    sess,
    [
      {
        label: "Fees collected (platform)",
        value: formatPhpForPdf(summary.totalReservationFees),
        hint: "Online reservation fees (e.g. ₱500 slot fee)",
      },
      {
        label: "Gross room value (at resort)",
        value: formatPhpForPdf(summary.totalGrossBookings),
        hint: "Room balances due at check-in",
      },
      {
        label: "Revenue this month",
        value: formatPhpForPdf(summary.revenueThisMonth),
        hint: "Confirmed · current month",
      },
      {
        label: "Bookings",
        value: `${summary.totalConfirmed} confirmed`,
        hint: `${summary.totalPending} pending payment`,
      },
    ],
    resortName,
    resortLogo,
    platformLogo,
  );

  const tableRows = breakdown.map((row) => [
    row.date,
    String(row.reservations),
    String(row.confirmed),
    formatPhpForPdf(Number(row.feesCollected)),
    formatPhpForPdf(Number(row.grossBookings)),
  ]);

  if (tableRows.length > 0) {
    sess = resortDrawSection(sess, "Booking breakdown", resortName, resortLogo, platformLogo);
    sess = resortDrawTable(
      sess,
      ["Date", "Reservations", "Confirmed", "Fees", "Gross"],
      tableRows,
      resortName,
      resortLogo,
      platformLogo,
    );
  }

  drawResortPageFooter(sess, resortName);

  const fileDate = new Date().toISOString().slice(0, 10);
  const slug = resortName.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
  downloadPdfDocument(sess.doc, `${slug || "resort"}-revenue-${fileDate}.pdf`);
}
