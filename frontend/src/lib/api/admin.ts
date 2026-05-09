import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { ResortItem } from "@/lib/api/resort";

export type AdminStats = {
  totalResorts: number;
  publicResorts: number;
  suspendedResorts: number;
  gracePeriodResorts: number;
  totalUsers: number;
  newUsersThisWeek: number;
  totalReservations: number;
  confirmedReservations: number;
  pendingPayment: number;
  totalRevenue: number;
  revenueThisMonth: number;
  recentReservations: AdminRecentReservation[];
};

export type AdminRecentReservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  reservation_fee: string;
  total_amount: string;
  created_at: string;
};

function normalizeRecentReservations(
  value: unknown,
): AdminRecentReservation[] {
  if (Array.isArray(value)) {
    return value as AdminRecentReservation[];
  }

  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: AdminRecentReservation[] }).data;
  }

  return [];
}

export type AuditLog = {
  id: number;
  tenant_id: number | null;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
};

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<ApiEnvelope<AdminStats>>("/admin/stats");
  const payload = data.data;
  return {
    ...payload,
    recentReservations: normalizeRecentReservations(payload?.recentReservations),
  };
}

export async function getAuditLogs(params?: {
  action?: string;
  entityType?: string;
  userId?: number;
  perPage?: number;
  page?: number;
}): Promise<Paginated<AuditLog>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<AuditLog>>>("/admin/audit-logs", {
    params
  });
  return data.data;
}

export type SystemSetting = {
  key: string;
  value: string;
  type: string;
  description: string | null;
};

export type XenditLog = {
  id: number;
  event_id: string;
  event_type: string | null;
  invoice_id: string | null;
  processed_at: string;
};

export type SuspensionItem = {
  subscriptionId: number;
  plan: string;
  status: string;
  nextDueDate: string;
  graceUntil: string | null;
  totalMonthlyFee: number;
  resort: { id: number; name: string; address: string | null; isVip: boolean } | null;
};

export type AssignableOwner = {
  id: number;
  name: string;
  email: string;
};

export type AdminSubscriptionOverviewItem = ResortItem & {
  latest_invoice_status: string;
};

export type AnalyticsResort = { id: number; name: string };

export type AnalyticsSummary = {
  totalCount: number;
  confirmedCount: number;
  cancelledCount: number;
  pendingCount: number;
  totalRevenue: number;
  avgValue: number;
  confirmationRate: number;
  cancellationRate: number;
};

export type AnalyticsMonthly = {
  month: number;
  reservationsCount: number;
  revenue: number;
  cancelledCount: number;
};

export type AnalyticsTopResort = {
  resort_id: number;
  name: string;
  revenue: number;
  count: number;
};

export type AnalyticsTopResortByCount = {
  resort_id: number;
  name: string;
  count: number;
  confirmedRevenue: number;
};

export type AdminAnalytics = {
  summary: AnalyticsSummary;
  statusBreakdown: Record<string, number>;
  daily: Array<{ day: string; reservationsCount: number; revenue: number }>;
  monthly: AnalyticsMonthly[];
  topResortsByRevenue: AnalyticsTopResort[];
  topResortsByCount: AnalyticsTopResortByCount[];
  resorts: AnalyticsResort[];
};

export type AnalyticsFilters = {
  resort_id?: number | "";
  year?: number;
  month?: number | "";
  min_revenue?: number | "";
  max_revenue?: number | "";
};

export async function getSystemSettings(): Promise<SystemSetting[]> {
  const { data } = await apiClient.get<ApiEnvelope<SystemSetting[]>>("/admin/settings");
  return data.data;
}

export async function updateSystemSettings(settings: { key: string; value: string }[]): Promise<void> {
  await apiClient.put("/admin/settings", { settings });
}

export async function sendAdminMailTest(toEmail: string): Promise<{ email_log_id: number }> {
  const { data } = await apiClient.post<ApiEnvelope<{ email_log_id: number }>>("/admin/mail/test", {
    to_email: toEmail,
  });
  return data.data;
}

export async function getXenditLogs(params?: { perPage?: number; page?: number }): Promise<Paginated<XenditLog>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<XenditLog>>>("/admin/xendit-logs", { params });
  return data.data;
}

export async function getSuspensionList(params?: { filter?: string; perPage?: number; page?: number }): Promise<Paginated<SuspensionItem>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<SuspensionItem>>>("/admin/suspensions", { params });
  return data.data;
}

export async function setResortVip(resortId: number, isVip: boolean, reason?: string): Promise<void> {
  await apiClient.post(`/admin/resorts/${resortId}/vip`, { is_vip: isVip, reason });
}

export async function adminOnboard(payload: {
  tenant_name: string;
  resort_name: string;
  subdomain: string;
  address?: string;
  contact_number?: string;
  logo_url?: string;
  description?: string;
  plan?: "basic";
  owner_user_id: number;
  is_publicly_listed?: boolean;
}) {
  const { data } = await apiClient.post("/admin/resorts/onboard", payload);
  return data.data;
}

export async function getAssignableOwners(): Promise<AssignableOwner[]> {
  const { data } = await apiClient.get<ApiEnvelope<AssignableOwner[]>>("/admin/resorts/assignable-owners");
  return data.data;
}

export async function getAdminSubscriptionOverview(): Promise<AdminSubscriptionOverviewItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminSubscriptionOverviewItem[]>>(
    "/admin/subscriptions/overview",
  );
  return data.data;
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "data" in value && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export async function getAdminAnalytics(filters?: AnalyticsFilters): Promise<AdminAnalytics> {
  const params: Record<string, string | number> = {};
  if (filters?.resort_id)   params.resort_id   = filters.resort_id;
  if (filters?.year)        params.year        = filters.year;
  if (filters?.month)       params.month       = filters.month;
  if (filters?.min_revenue) params.min_revenue = filters.min_revenue;
  if (filters?.max_revenue) params.max_revenue = filters.max_revenue;

  const { data } = await apiClient.get<ApiEnvelope<AdminAnalytics>>("/admin/analytics", { params });
  const raw = data.data ?? ({} as AdminAnalytics);
  return {
    summary: raw.summary ?? {
      totalCount: 0, confirmedCount: 0, cancelledCount: 0, pendingCount: 0,
      totalRevenue: 0, avgValue: 0, confirmationRate: 0, cancellationRate: 0,
    },
    statusBreakdown: (raw.statusBreakdown && typeof raw.statusBreakdown === "object") ? raw.statusBreakdown : {},
    daily:              normalizeArray(raw.daily),
    monthly:            normalizeArray(raw.monthly),
    topResortsByRevenue: normalizeArray(raw.topResortsByRevenue),
    topResortsByCount:   normalizeArray(raw.topResortsByCount),
    resorts:             normalizeArray(raw.resorts),
  };
}

export async function uploadResortLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("logo", file);
  const { data } = await apiClient.post<ApiEnvelope<{ logo_url: string }>>(
    "/admin/resorts/onboard/upload-logo",
    form,
  );
  return data.data.logo_url;
}
