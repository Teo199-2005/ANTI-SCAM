import { apiClient } from "@/lib/api/client";
import { reservationCheckIn, reservationCheckOut } from "@/lib/api/reservationDates";
import type { ApiEnvelope } from "@/lib/api/types";

export type RecentReservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: string;
};

export type ResortDashboardStats = {
  activeRooms: number;
  lockedBookings: number;
  confirmedToday: number;
  occupancyRate?: number;
  totalReservationFees?: number;
  totalGrossBookings?: number;
  revenueThisMonth?: number;
  totalConfirmed?: number;
  totalPending?: number;
  recentReservations: RecentReservation[];
};

function normalizeRecentReservationRow(row: unknown): RecentReservation {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: Number(r.id ?? 0),
    reference_no: String(r.reference_no ?? r.referenceNo ?? ""),
    status: String(r.status ?? ""),
    check_in_date: reservationCheckIn(r),
    check_out_date: reservationCheckOut(r),
    total_amount: String(r.total_amount ?? r.totalAmount ?? "0"),
  };
}

function normalizeRecentReservations(value: unknown): RecentReservation[] {
  if (Array.isArray(value)) {
    return value.map(normalizeRecentReservationRow);
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data.map(normalizeRecentReservationRow);
  }

  if (value && typeof value === "object") {
    const values = Object.values(value as Record<string, unknown>);
    if (values.length > 0 && values.every((v) => v && typeof v === "object")) {
      return values.map(normalizeRecentReservationRow);
    }
  }

  return [];
}

export async function getResortStats() {
  const { data } = await apiClient.get<ApiEnvelope<ResortDashboardStats>>("/dashboard/resort-stats");
  const payload = (data.data ?? {}) as Record<string, unknown>;
  const recentRaw =
    payload.recentReservations ?? payload.recent_reservations ?? [];
  return {
    ...(payload as ResortDashboardStats),
    recentReservations: normalizeRecentReservations(recentRaw),
  };
}

export type ResortRevenueFilterPeriod = "weekly" | "monthly" | "yearly" | "custom";

export type ResortBookingCalendarReservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: string;
};

export type ResortBookingCalendarPayload = {
  year: number;
  month: number;
  start: string;
  end: string;
  reservations: ResortBookingCalendarReservation[];
};

export type ResortRevenueFilters = {
  period: ResortRevenueFilterPeriod;
  year?: number;
  month?: number | "";
  week?: number | "";
  from?: string;
  to?: string;
};

export type ResortRevenueSeriesRow = {
  date: string;
  reservations: number;
  confirmed: number;
  feesCollected: number;
  grossBookings: number;
};

export type ResortRevenueAnalyticsPayload = {
  summary: {
    totalReservationFees: number;
    totalGrossBookings: number;
    revenueThisMonth: number;
    totalConfirmed: number;
    totalPending: number;
  };
  series: ResortRevenueSeriesRow[];
  resort: {
    name: string | null;
    logo_url: string | null;
  };
  filters: {
    period: ResortRevenueFilterPeriod;
    year: number;
    month: number | null;
    week: number | null;
    from: string | null;
    to: string | null;
  };
};

function normalizeRevenueSeries(value: unknown): ResortRevenueSeriesRow[] {
  if (Array.isArray(value)) {
    return value.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        date: String(item.date ?? ""),
        reservations: Number(item.reservations ?? 0),
        confirmed: Number(item.confirmed ?? 0),
        feesCollected: Number(item.feesCollected ?? item.fees_collected ?? 0),
        grossBookings: Number(item.grossBookings ?? item.gross_bookings ?? 0),
      };
    });
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return normalizeRevenueSeries((value as { data: unknown[] }).data);
  }

  return [];
}

function normalizeResortRevenuePayload(value: unknown): ResortRevenueAnalyticsPayload {
  const payload = (value ?? {}) as Record<string, unknown>;
  const summary = (payload.summary ?? {}) as Record<string, unknown>;
  const resort = (payload.resort ?? {}) as Record<string, unknown>;
  const filters = (payload.filters ?? {}) as Record<string, unknown>;

  return {
    summary: {
      totalReservationFees: Number(summary.totalReservationFees ?? 0),
      totalGrossBookings: Number(summary.totalGrossBookings ?? 0),
      revenueThisMonth: Number(summary.revenueThisMonth ?? 0),
      totalConfirmed: Number(summary.totalConfirmed ?? 0),
      totalPending: Number(summary.totalPending ?? 0),
    },
    series: normalizeRevenueSeries(payload.series),
    resort: {
      name: resort.name == null ? null : String(resort.name),
      logo_url: resort.logo_url == null ? null : String(resort.logo_url),
    },
    filters: {
      period: (filters.period as ResortRevenueFilterPeriod) ?? "monthly",
      year: Number(filters.year ?? new Date().getFullYear()),
      month: filters.month == null ? null : Number(filters.month),
      week: filters.week == null ? null : Number(filters.week),
      from: filters.from == null ? null : String(filters.from),
      to: filters.to == null ? null : String(filters.to),
    },
  };
}

export async function getResortRevenueAnalytics(
  filters: ResortRevenueFilters,
): Promise<ResortRevenueAnalyticsPayload> {
  const params: Record<string, string | number> = {
    period: filters.period,
  };
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  if (filters.week) params.week = filters.week;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const { data } = await apiClient.get<ApiEnvelope<ResortRevenueAnalyticsPayload>>(
    "/dashboard/resort-revenue-analytics",
    { params },
  );
  return normalizeResortRevenuePayload(data.data);
}

function normalizeBookingCalendarPayload(value: unknown): ResortBookingCalendarPayload {
  const payload = (value ?? {}) as Record<string, unknown>;
  const reservationsRaw = Array.isArray(payload.reservations) ? payload.reservations : [];
  return {
    year: Number(payload.year ?? new Date().getFullYear()),
    month: Number(payload.month ?? new Date().getMonth() + 1),
    start: String(payload.start ?? ""),
    end: String(payload.end ?? ""),
    reservations: reservationsRaw.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: Number(item.id ?? 0),
        reference_no: String(item.reference_no ?? item.referenceNo ?? ""),
        status: String(item.status ?? "pending_payment"),
        check_in_date: reservationCheckIn(item),
        check_out_date: reservationCheckOut(item),
        total_amount: String(item.total_amount ?? item.totalAmount ?? "0"),
      };
    }),
  };
}

export async function getResortBookingCalendar(year: number, month: number): Promise<ResortBookingCalendarPayload> {
  const { data } = await apiClient.get<ApiEnvelope<ResortBookingCalendarPayload>>(
    "/dashboard/resort-booking-calendar",
    { params: { year, month } },
  );
  return normalizeBookingCalendarPayload(data.data);
}
