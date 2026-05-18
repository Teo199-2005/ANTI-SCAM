import { jsPDF } from "jspdf";

const OPC_FOOTER =
  "Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.";

export function createPortraitPdf(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: [210, 297] });
}

export function drawPdfWatermark(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.text("ANTI-SCAM PH", pageWidth / 2, pageHeight / 2, { angle: 28, align: "center" });
  doc.restoreGraphicsState();
}

export function drawPdfFooter(doc: jsPDF, pageNum: number, reportLabel: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 12;
  const right = pageWidth - 12;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  doc.line(left, pageHeight - 14, right, pageHeight - 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7.5);
  doc.text(`Anti-Scam PH · ${reportLabel}`, left, pageHeight - 11);
  doc.setFontSize(6.8);
  const disclaimer = doc.splitTextToSize(OPC_FOOTER, right - left - 22);
  doc.text(disclaimer, left, pageHeight - 8, { lineHeightFactor: 1.15 });
  doc.setFontSize(7.5);
  doc.text(`Page ${pageNum}`, right, pageHeight - 3.5, { align: "right" });
}

export function drawPdfReportHeader(
  doc: jsPDF,
  y: number,
  opts: { title: string; subtitle: string; rightLines: string[] },
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 12;
  const right = pageWidth - 12;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.rect(left, y, right - left, 24, "S");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.title, left + 3, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.subtitle, left + 3, y + 15);
  opts.rightLines.forEach((line, i) => {
    doc.text(line, right - 2, y + 9 + i * 6, { align: "right" });
  });

  return y + 30;
}

/**
 * Download + optional in-tab preview via blob: URL (never file://).
 * Revoking the blob URL too early breaks downloads in Chrome/Edge.
 */
export function downloadPdfDocument(doc: jsPDF, fileName: string, openPreview = true): void {
  const safeName = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;

  let blob: Blob;
  try {
    blob = doc.output("blob") as Blob;
  } catch {
    const buffer = doc.output("arraybuffer") as ArrayBuffer;
    blob = new Blob([buffer], { type: "application/pdf" });
  }

  if (blob.size === 0) {
    throw new Error("PDF export produced an empty file.");
  }

  if (openPreview) {
    const previewUrl = URL.createObjectURL(blob);
    const preview = window.open(previewUrl, "_blank", "noopener,noreferrer");
    if (preview) {
      setTimeout(() => URL.revokeObjectURL(previewUrl), 120_000);
    }
  }

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = safeName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }, 60_000);
}

export function ensurePdfPageSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  pageNum: number,
  reportLabel: string,
  onNewPage: () => number,
): { y: number; pageNum: number } {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - 18) {
    return { y, pageNum };
  }
  drawPdfFooter(doc, pageNum, reportLabel);
  doc.addPage();
  drawPdfWatermark(doc);
  return { y: onNewPage(), pageNum: pageNum + 1 };
}
