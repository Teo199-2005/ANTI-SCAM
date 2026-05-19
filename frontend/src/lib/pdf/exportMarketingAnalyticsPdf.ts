import type { MarketingAnalyticsPayload } from "@/lib/api/marketing";
import { formatPhpForPdf } from "@/lib/formatPhp";
import {
  beginBrandedPdf,
  drawBrandedKpiRow,
  drawBrandedSection,
  drawBrandedTable,
  finishBrandedPdf,
} from "@/lib/pdf/brandedAnalyticsPdf";

function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}

export async function exportMarketingAnalyticsPdf(
  data: MarketingAnalyticsPayload,
  year: number,
): Promise<void> {
  const t = data.totals;
  const reportLabel = "Marketing Analytics Report";

  let sess = await beginBrandedPdf(reportLabel, {
    title: "Marketing Analytics",
    subtitle: "Booking commissions & qualifying guest bookings",
    metaLines: [`Year ${year}`, `Generated: ${new Date().toLocaleString("en-PH")}`],
  });

  sess = drawBrandedSection(sess, "Year-to-date totals");
  sess = drawBrandedKpiRow(sess, [
    { label: "Pending commission", value: formatPhpForPdf(t.commission_pending_ytd) },
    { label: "Released commission", value: formatPhpForPdf(t.commission_released_ytd) },
    { label: "Booking credits", value: String(t.booking_credits_ytd) },
    { label: "Reversed bookings", value: String(t.booking_reversals_ytd) },
  ]);

  const monthlyRows = (data.monthly ?? []).map((m) => [
    monthLabel(m.period),
    formatPhpForPdf(m.commission_pending),
    formatPhpForPdf(m.commission_released),
    String(m.booking_credits_count),
  ]);
  if (monthlyRows.length > 0) {
    sess = drawBrandedSection(sess, "Monthly activity");
    sess = drawBrandedTable(sess, ["Month", "Pending", "Released", "Bookings"], monthlyRows);
  }

  const resortRows = (data.by_resort ?? []).map((r) => [
    r.resort_name,
    formatPhpForPdf(r.commission_total),
    formatPhpForPdf(r.commission_pending),
    formatPhpForPdf(r.commission_released),
  ]);
  if (resortRows.length > 0) {
    sess = drawBrandedSection(sess, "By assigned resort");
    sess = drawBrandedTable(sess, ["Resort", "Total", "Pending", "Released"], resortRows);
  }

  const fileDate = new Date().toISOString().slice(0, 10);
  finishBrandedPdf(sess, `anti-scamph-marketing-analytics-${year}-${fileDate}.pdf`);
}
