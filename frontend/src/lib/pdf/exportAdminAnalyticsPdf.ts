import type { AdminAnalytics, AnalyticsFilters } from "@/lib/api/admin";
import { formatPhpForPdf } from "@/lib/formatPhp";
import {
  beginBrandedPdf,
  drawBrandedKpiRow,
  drawBrandedLine,
  drawBrandedSection,
  drawBrandedTable,
  finishBrandedPdf,
} from "@/lib/pdf/brandedAnalyticsPdf";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function filterSummary(applied: AnalyticsFilters): string {
  const parts: string[] = [`Year ${applied.year ?? new Date().getFullYear()}`];
  if (applied.month) parts.push(MONTHS[(applied.month as number) - 1] ?? "");
  if (applied.resort_id) parts.push(`Resort #${applied.resort_id}`);
  if (applied.min_revenue) parts.push(`Min ${formatPhpForPdf(Number(applied.min_revenue))}`);
  if (applied.max_revenue) parts.push(`Max ${formatPhpForPdf(Number(applied.max_revenue))}`);
  return parts.join(" · ");
}

export async function exportAdminAnalyticsPdf(
  data: AdminAnalytics,
  applied: AnalyticsFilters,
): Promise<void> {
  const summary = data.summary;
  const reportLabel = "Platform Analytics Report";

  let sess = await beginBrandedPdf(reportLabel, {
    title: "Platform Analytics",
    subtitle: "Verified resort bookings — platform-wide report",
    metaLines: [
      `Filters: ${filterSummary(applied)}`,
      `Generated: ${new Date().toLocaleString("en-PH")}`,
    ],
  });

  sess = drawBrandedSection(sess, "Summary");
  sess = drawBrandedKpiRow(sess, [
    {
      label: "Total revenue",
      value: formatPhpForPdf(Number(summary?.totalRevenue ?? 0)),
      hint: "Confirmed reservations",
    },
    {
      label: "Avg. booking value",
      value: formatPhpForPdf(Number(summary?.avgValue ?? 0)),
      hint: "Per confirmed stay",
    },
    {
      label: "Total bookings",
      value: String(summary?.totalCount ?? 0),
      hint: `${summary?.confirmedCount ?? 0} confirmed · ${summary?.pendingCount ?? 0} pending`,
    },
    {
      label: "Confirmation rate",
      value: `${summary?.confirmationRate ?? 0}%`,
      hint: `Cancellation ${summary?.cancellationRate ?? 0}%`,
    },
  ]);

  const monthlyRows = (data.monthly ?? []).map((m) => [
    MONTHS[m.month - 1] ?? String(m.month),
    formatPhpForPdf(m.revenue),
    String(m.reservationsCount),
    String(m.cancelledCount),
  ]);
  if (monthlyRows.length > 0) {
    sess = drawBrandedSection(sess, "Monthly overview");
    sess = drawBrandedTable(sess, ["Month", "Revenue", "Bookings", "Cancelled"], monthlyRows);
  }

  const topRevRows = (data.topResortsByRevenue ?? []).slice(0, 15).map((r) => [
    r.name,
    formatPhpForPdf(r.revenue),
    String(r.count),
  ]);
  if (topRevRows.length > 0) {
    sess = drawBrandedSection(sess, "Top resorts by revenue");
    sess = drawBrandedTable(sess, ["Resort", "Revenue", "Confirmed"], topRevRows);
  }

  const topCntRows = (data.topResortsByCount ?? []).slice(0, 15).map((r) => [
    r.name,
    String(r.count),
    formatPhpForPdf(r.confirmedRevenue),
  ]);
  if (topCntRows.length > 0) {
    sess = drawBrandedSection(sess, "Top resorts by bookings");
    sess = drawBrandedTable(sess, ["Resort", "Bookings", "Confirmed revenue"], topCntRows);
  }

  const statusEntries = Object.entries(data.statusBreakdown ?? {});
  if (statusEntries.length > 0) {
    sess = drawBrandedSection(sess, "Reservation status");
    for (const [status, count] of statusEntries) {
      sess = drawBrandedLine(sess, `${status.replaceAll("_", " ")}: ${count}`);
    }
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  finishBrandedPdf(sess, `anti-scamph-platform-analytics-${fileDate}.pdf`);
}
