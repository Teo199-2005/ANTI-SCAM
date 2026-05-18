"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import {
  getResortRevenueAnalytics,
  type ResortRevenueAnalyticsPayload,
  type ResortRevenueFilterPeriod,
  type ResortRevenueFilters,
} from "@/lib/api/dashboard";
import { color, rgb, shadowKpiTint } from "@/lib/design-tokens";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { downloadPdfDocument } from "@/lib/pdf/analyticsReportPdf";
import { jsPDF } from "jspdf";
import {
  BadgeDollarSign,
  CalendarCheck2,
  Download,
  Filter,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { getOwnerLandingPage } from "@/lib/api/landingPage";
import { isBusinessProPlan } from "@/lib/subscriptionPlans";
import { useEffect, useMemo, useState } from "react";
import { formatPhp, formatPhpForPdf } from "@/lib/formatPhp";
import { loadBrandLogoDataUrlForPdf } from "@/lib/pdf/brandedAnalyticsPdf";
import Link from "next/link";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const WEEK_OPTIONS = Array.from({ length: 53 }, (_, i) => i + 1);

export default function ResortRevenuePage() {
  const [planAllowed, setPlanAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [payload, setPayload] = useState<ResortRevenueAnalyticsPayload | null>(null);
  const [filters, setFilters] = useState<ResortRevenueFilters>({
    period: "monthly",
    year: CURRENT_YEAR,
    month: "",
    week: "",
  });
  const [applied, setApplied] = useState<ResortRevenueFilters>({
    period: "monthly",
    year: CURRENT_YEAR,
    month: "",
    week: "",
  });

  useEffect(() => {
    void getOwnerLandingPage()
      .then((landing) => {
        setPlanAllowed(
          isBusinessProPlan(landing.subscription_plan, landing.subscription_status),
        );
      })
      .catch(() => setPlanAllowed(false));
  }, []);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: ResortRevenueFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResortRevenueAnalytics(f);
      setPayload(data);
    } catch {
      setError("Failed to load revenue data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(applied); }, [applied]);

  const totals = useMemo(() => ({
    totalReservationFees: payload?.summary.totalReservationFees ?? 0,
    totalGrossBookings: payload?.summary.totalGrossBookings ?? 0,
    revenueThisMonth: payload?.summary.revenueThisMonth ?? 0,
    totalConfirmed: payload?.summary.totalConfirmed ?? 0,
    totalPending: payload?.summary.totalPending ?? 0,
  }), [payload]);

  const breakdown = Array.isArray(payload?.series) ? payload.series : [];

  const applyFilters = () => {
    const next: ResortRevenueFilters = { ...filters };
    if (next.period !== "monthly") next.month = "";
    if (next.period !== "weekly") next.week = "";
    if (next.period !== "custom") {
      next.from = "";
      next.to = "";
    }
    setApplied(next);
  };

  const resetFilters = () => {
    const next: ResortRevenueFilters = {
      period: "monthly",
      year: CURRENT_YEAR,
      month: "",
      week: "",
      from: "",
      to: "",
    };
    setFilters(next);
    setApplied(next);
  };

  const handleExportPdf = async () => {
    if (!payload) return;
    setExportingPdf(true);
    try {
      const brandLogo = await loadBrandLogoDataUrlForPdf();
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [210, 297], // explicit A4 size
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 12;
      const right = pageWidth - 12;
      let y = 12;
      const fmtMoney = (value: number) => formatPhpForPdf(value);
      const drawFooter = (pageNum: number) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.15);
        doc.line(left, pageHeight - 14, right, pageHeight - 14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(7.5);
        doc.text("Anti-Scam PH · Revenue Report", left, pageHeight - 11);
        doc.setFontSize(6.8);
        const disclaimer = doc.splitTextToSize(
          "Anti-Scam PH is a product and service operated by The Rising 2 Brothers OPC.",
          right - left - 22,
        );
        doc.text(disclaimer, left, pageHeight - 8, { lineHeightFactor: 1.15 });
        doc.setFontSize(7.5);
        doc.text(`Page ${pageNum}`, right, pageHeight - 3.5, { align: "right" });
      };
      const drawTableHeader = (top: number) => {
        doc.setDrawColor(0, 0, 0);
        doc.setFillColor(245, 245, 245);
        doc.rect(left, top, right - left, 8, "FD");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("Date", left + 2, top + 5.2);
        doc.text("Reservations", left + 38, top + 5.2);
        doc.text("Confirmed", left + 72, top + 5.2);
        doc.text("Fees", left + 98, top + 5.2);
        doc.text("Gross", left + 144, top + 5.2);
      };
      const drawWatermark = () => {
        doc.saveGraphicsState();
        doc.setTextColor(180, 180, 180);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(38);
        doc.text("ANTI-SCAM PH", pageWidth / 2, pageHeight / 2, { angle: 28, align: "center" });
        doc.restoreGraphicsState();
      };

      let resortLogoDataUrl: string | null = null;
      if (payload.resort.logo_url) {
        try {
          const logoUrl = laravelPublicUrl(payload.resort.logo_url);
          const res = await fetch(logoUrl, { mode: "cors" });
          const blob = await res.blob();
          resortLogoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
        } catch {
          resortLogoDataUrl = null;
        }
      }

      const headerLogo = brandLogo ?? resortLogoDataUrl;
      const headerH = 32;
      doc.setFillColor(13, 30, 66);
      doc.rect(0, y - 2, pageWidth, headerH, "F");
      doc.setFillColor(204, 27, 46);
      doc.rect(0, y - 2 + headerH, pageWidth, 1, "F");
      if (headerLogo) {
        doc.addImage(headerLogo, "PNG", left, y + 2, 18, 18);
      }
      const titleX = headerLogo ? left + 22 : left;
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ANTI-SCAM PH", titleX, y + 10);
      doc.setFontSize(11);
      doc.text(payload.resort.name || "Resort Revenue Report", titleX, y + 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(220, 230, 245);
      doc.text("Revenue & analytics report", titleX, y + 22);
      doc.setTextColor(255, 255, 255);
      doc.text(`Period: ${applied.period.toUpperCase()}`, right - 2, y + 10, { align: "right" });
      doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, right - 2, y + 17, { align: "right" });
      y += headerH + 6;

      drawWatermark();

      // Summary cards (black/white)
      const cardW = (right - left - 6) / 2;
      const drawKpi = (x: number, top: number, label: string, value: string) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.rect(x, top, cardW, 18, "S");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(label, x + 3, top + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(value, x + 3, top + 13);
      };
      drawKpi(left, y, "Fees Collected", fmtMoney(totals.totalReservationFees));
      drawKpi(left + cardW + 6, y, "Gross Bookings", fmtMoney(totals.totalGrossBookings));
      y += 21;
      drawKpi(left, y, "Revenue This Month", fmtMoney(totals.revenueThisMonth));
      drawKpi(left + cardW + 6, y, "Confirmed / Pending", `${totals.totalConfirmed} / ${totals.totalPending}`);
      y += 24;

      // Table
      drawTableHeader(y);
      y += 11;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      let pageNum = 1;

      for (const row of breakdown) {
        if (y > pageHeight - 18) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum += 1;
          drawWatermark();
          y = 16;
          drawTableHeader(y);
          y += 11;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
        }
        doc.setDrawColor(0, 0, 0);
        doc.line(left, y + 0.8, right, y + 0.8);
        doc.text(row.date, left + 2, y + 4.7);
        doc.text(String(row.reservations), left + 47, y + 4.7);
        doc.text(String(row.confirmed), left + 79, y + 4.7);
        doc.text(fmtMoney(Number(row.feesCollected)), left + 100, y + 4.7);
        doc.text(fmtMoney(Number(row.grossBookings)), left + 145, y + 4.7);
        y += 7;
      }
      drawFooter(pageNum);

      const fileDate = new Date().toISOString().slice(0, 10);
      const fileName = `${(payload.resort.name || "resort").replace(/\s+/g, "-").toLowerCase()}-revenue-${fileDate}.pdf`;
      downloadPdfDocument(doc, fileName);
    } finally {
      setExportingPdf(false);
    }
  };

  const kpis = [
    {
      label: "Fees collected",
      value: formatPhp(totals.totalReservationFees),
      sub: "Reservation fees paid to date",
      icon: BadgeDollarSign,
      accent: color.semantic.success,
      rgbKey: rgb.success,
    },
    {
      label: "Gross bookings",
      value: formatPhp(totals.totalGrossBookings),
      sub: "Total booking value (all time)",
      icon: TrendingUp,
      accent: color.brand.accentHover,
      rgbKey: rgb.accent,
    },
    {
      label: "Revenue this month",
      value: formatPhp(totals.revenueThisMonth),
      sub: "Confirmed bookings · current month",
      icon: ReceiptText,
      accent: color.data.skyBright,
      rgbKey: rgb.sky500,
    },
    {
      label: "Confirmed bookings",
      value: String(totals.totalConfirmed),
      sub: `${totals.totalPending} still pending payment`,
      icon: CalendarCheck2,
      accent: color.data.s6,
      rgbKey: rgb.violet,
    },
  ];

  if (planAllowed === null) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading…</div>;
  }

  if (!planAllowed) {
    return (
      <div className="dash-card max-w-xl space-y-4 p-8">
        <h1 className="dash-page-title">Revenue &amp; analytics</h1>
        <p className="text-sm text-zinc-600">
          Revenue reporting is included with Business Pro (₱1,000/month).
        </p>
        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => window.dispatchEvent(new Event("subscription:open-upgrade"))}
        >
          Upgrade to Business Pro
        </button>
        <Link href="/dashboard/resort" className="block text-sm text-primaryBlue hover:underline">
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dash-filter-bar w-full md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <TrendingUp size={22} className="text-accentOrange" /> Revenue Report
          </h1>
          <p className="dash-page-sub">Overview of all reservation revenue for this resort.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load(applied)} disabled={loading} className="dash-btn-sm disabled:opacity-60">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={loading || exportingPdf || !payload}
            className="dash-btn-primary disabled:opacity-60"
          >
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export PDF
          </button>
        </div>
      </div>

      <DashCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={15} className="text-skyBlue" />
          <span className="text-sm font-semibold text-navy">Revenue Filters</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Period</label>
            <select
              className="dash-input w-full"
              value={filters.period}
              onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value as ResortRevenueFilterPeriod }))}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom date range</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
            <select
              className="dash-input w-full"
              value={filters.year ?? CURRENT_YEAR}
              onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Month</label>
            <select
              className="dash-input w-full"
              disabled={filters.period !== "monthly"}
              value={filters.month ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value ? Number(e.target.value) : "" }))}
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Week</label>
            <select
              className="dash-input w-full"
              disabled={filters.period !== "weekly"}
              value={filters.week ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, week: e.target.value ? Number(e.target.value) : "" }))}
            >
              <option value="">Current week</option>
              {WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">From</label>
              <input
                type="date"
                className="dash-input w-full"
                disabled={filters.period !== "custom"}
                value={filters.from ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">To</label>
              <input
                type="date"
                className="dash-input w-full"
                disabled={filters.period !== "custom"}
                value={filters.to ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={applyFilters} disabled={loading} className="dash-btn-primary disabled:opacity-60">
            <Filter size={13} /> Apply
          </button>
          <button type="button" onClick={resetFilters} disabled={loading} className="dash-btn-sm disabled:opacity-60">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </DashCard>

      {error && (
        <div className="dash-alert-error">{error}</div>
      )}

      {/* KPI grid */}
      {loading ? (
        <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-softCard shadow-card md:h-32" />
          ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-softBorderStrong/70 bg-softGray/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-2xl border border-softBorderStrong/60 bg-softCard p-4 shadow-sm motion-safe:transition-transform motion-safe:duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 md:p-5"
              style={{ boxShadow: shadowKpiTint(k.rgbKey, 0.14) }}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: k.accent }} />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ background: `rgba(${k.rgbKey}, 0.04)` }}
              />
              <div className="relative mb-2 flex items-center gap-2 md:mb-3">
                <div className="inline-flex shrink-0 rounded-lg p-1.5 md:p-2" style={{ background: k.accent }}>
                  <k.icon size={14} className="text-white" />
                </div>
                <p className="min-w-0 font-dash text-[11px] font-medium leading-tight text-zinc-600 md:text-dash-xs">{k.label}</p>
              </div>
              <p className="relative break-words font-dash text-lg font-bold leading-tight text-navy md:text-2xl">{k.value}</p>
              <p className="relative mt-1 line-clamp-2 font-dash text-[9px] leading-snug text-zinc-400 md:text-[10px]">{k.sub}</p>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Breakdown table */}
      <DashCard className="overflow-hidden p-0">
        <div className="border-b border-softBorder px-6 py-4">
          <h2 className="font-dash text-base font-semibold text-navy">Revenue breakdown</h2>
          <p className="text-xs text-zinc-400">Revenue and reservation count by selected filter range</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : breakdown.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-500">
            <TrendingUp size={28} className="mx-auto text-zinc-300 mb-3" />
            <p>No data available for selected filters.</p>
            <p className="text-xs mt-1 text-zinc-400">Try changing period or date range.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {breakdown.map((row) => (
                <DashMobileTableCard
                  key={row.date}
                  title={row.date}
                  fields={[
                    { label: "Total bookings", value: row.reservations },
                    {
                      label: "Confirmed",
                      value: <span className="dash-badge-emerald">{row.confirmed}</span>,
                    },
                    { label: "Fees collected", value: formatPhp(Number(row.feesCollected)) },
                    { label: "Gross bookings", value: formatPhp(Number(row.grossBookings)) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total bookings</th>
                    <th>Confirmed</th>
                    <th>Fees collected</th>
                    <th>Gross bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((row) => (
                    <tr key={row.date}>
                      <td className="font-semibold text-navy">{row.date}</td>
                      <td className="text-zinc-600">{row.reservations}</td>
                      <td>
                        <span className="dash-badge-emerald">{row.confirmed}</span>
                      </td>
                      <td className="font-semibold text-emerald-700">{formatPhp(Number(row.feesCollected))}</td>
                      <td className="text-zinc-700">{formatPhp(Number(row.grossBookings))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}

