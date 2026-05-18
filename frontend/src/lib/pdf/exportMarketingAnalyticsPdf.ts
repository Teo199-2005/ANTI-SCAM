import type { MarketingAnalyticsPayload } from "@/lib/api/marketing";
import { formatPhpLedger as fmtMoney } from "@/lib/formatPhp";
import {
  createPortraitPdf,
  downloadPdfDocument,
  drawPdfFooter,
  drawPdfReportHeader,
  drawPdfWatermark,
  ensurePdfPageSpace,
} from "@/lib/pdf/analyticsReportPdf";

function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}

export function exportMarketingAnalyticsPdf(data: MarketingAnalyticsPayload, year: number): void {
  const doc = createPortraitPdf();
  const left = 12;
  let y = 12;
  let pageNum = 1;
  const reportLabel = "Marketing Analytics Report";

  drawPdfWatermark(doc);
  y = drawPdfReportHeader(doc, y, {
    title: "Marketing Analytics",
    subtitle: "Referral commissions and subscription volume",
    rightLines: [`Year ${year}`, `Generated: ${new Date().toLocaleString()}`],
  });

  const t = data.totals;
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

  drawLine("Year-to-date totals", true);
  drawLine(`Pending commission: ${fmtMoney(t.commission_pending_ytd)}`);
  drawLine(`Released commission: ${fmtMoney(t.commission_released_ytd)}`);
  drawLine(`Referral checkouts: ${t.referral_subscription_count_ytd}`);
  drawLine(`Referral volume: ${fmtMoney(t.referral_subscription_volume_ytd)}`);
  y += 4;

  drawLine("Monthly activity", true);
  for (const m of data.monthly ?? []) {
    drawLine(
      `${monthLabel(m.period)}: pending ${fmtMoney(m.commission_pending)} · released ${fmtMoney(m.commission_released)} · ${m.referral_payment_count} referral payments`,
    );
  }
  y += 4;

  drawLine("By assigned resort", true);
  for (const r of data.by_resort ?? []) {
    drawLine(
      `${r.resort_name}: total ${fmtMoney(r.commission_total)} · pending ${fmtMoney(r.commission_pending)} · released ${fmtMoney(r.commission_released)}`,
    );
  }

  drawPdfFooter(doc, pageNum, reportLabel);

  const fileDate = new Date().toISOString().slice(0, 10);
  downloadPdfDocument(doc, `anti-scamph-marketing-analytics-${year}-${fileDate}.pdf`);
}
