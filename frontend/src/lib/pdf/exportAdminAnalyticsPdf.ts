import type { AdminAnalytics, AnalyticsFilters } from "@/lib/api/admin";
import { formatPhp } from "@/lib/formatPhp";
import {
  createPortraitPdf,
  downloadPdfDocument,
  drawPdfFooter,
  drawPdfReportHeader,
  drawPdfWatermark,
  ensurePdfPageSpace,
} from "@/lib/pdf/analyticsReportPdf";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function filterSummary(applied: AnalyticsFilters): string {
  const parts: string[] = [`Year ${applied.year ?? new Date().getFullYear()}`];
  if (applied.month) parts.push(MONTHS[(applied.month as number) - 1] ?? "");
  if (applied.resort_id) parts.push(`Resort #${applied.resort_id}`);
  if (applied.min_revenue) parts.push(`Min ${formatPhp(Number(applied.min_revenue))}`);
  if (applied.max_revenue) parts.push(`Max ${formatPhp(Number(applied.max_revenue))}`);
  return parts.join(" · ");
}

export function exportAdminAnalyticsPdf(data: AdminAnalytics, applied: AnalyticsFilters): void {
  const doc = createPortraitPdf();
  const left = 12;
  let y = 12;
  let pageNum = 1;
  const reportLabel = "Platform Analytics Report";

  drawPdfWatermark(doc);
  y = drawPdfReportHeader(doc, y, {
    title: "Platform Analytics",
    subtitle: "Anti-Scam PH — Admin analytics export",
    rightLines: [`Filters: ${filterSummary(applied)}`, `Generated: ${new Date().toLocaleString()}`],
  });

  const summary = data.summary;
  const drawLine = (text: string, bold = false) => {
    const space = ensurePdfPageSpace(doc, y, 7, pageNum, reportLabel, () => 16);
    y = space.y;
    pageNum = space.pageNum;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(text, left, y);
    y += 6;
  };

  drawLine("Summary", true);
  drawLine(`Total revenue: ${formatPhp(Number(summary?.totalRevenue ?? 0))}`);
  drawLine(`Avg. reservation value: ${formatPhp(Number(summary?.avgValue ?? 0))}`);
  drawLine(
    `Bookings: ${summary?.totalCount ?? 0} total · ${summary?.confirmedCount ?? 0} confirmed · ${summary?.pendingCount ?? 0} pending`,
  );
  drawLine(
    `Confirmation rate: ${summary?.confirmationRate ?? 0}% · Cancellation: ${summary?.cancellationRate ?? 0}%`,
  );
  y += 4;

  drawLine("Monthly overview", true);
  for (const m of data.monthly ?? []) {
    drawLine(
      `${MONTHS[m.month - 1] ?? m.month}: ${formatPhp(m.revenue)} · ${m.reservationsCount} bookings · ${m.cancelledCount} cancelled`,
    );
  }
  y += 4;

  drawLine("Top resorts by revenue", true);
  for (const r of (data.topResortsByRevenue ?? []).slice(0, 15)) {
    drawLine(`${r.name}: ${formatPhp(r.revenue)} (${r.count} confirmed)`);
  }
  y += 4;

  drawLine("Top resorts by bookings", true);
  for (const r of (data.topResortsByCount ?? []).slice(0, 15)) {
    drawLine(`${r.name}: ${r.count} bookings · ${formatPhp(r.confirmedRevenue)} confirmed revenue`);
  }

  const statusEntries = Object.entries(data.statusBreakdown ?? {});
  if (statusEntries.length > 0) {
    y += 4;
    drawLine("Reservation status breakdown", true);
    for (const [status, count] of statusEntries) {
      drawLine(`${status.replaceAll("_", " ")}: ${count}`);
    }
  }

  drawPdfFooter(doc, pageNum, reportLabel);

  const fileDate = new Date().toISOString().slice(0, 10);
  downloadPdfDocument(doc, `anti-scamph-platform-analytics-${fileDate}.pdf`);
}
