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
  sort_by?: string;
  sort_dir?: string;
}): Promise<Paginated<AuditLog>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<AuditLog>>>("/admin/audit-logs", {
    params,
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
  accept_terms: boolean;
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

// ── Admin finance (payment ledger, commissions, withholding) ───────────────────

export type AdminFinanceOverview = {
  withholding_rate: number;
  withholding_percent_label: string;
  subscription_inflows_paid: number;
  subscription_inflows_pending: number;
  guest_booking_paid_total: number;
  commission_gross_pending: number;
  commission_gross_released: number;
  commission_net_paid_to_marketers: number;
  payout_batches_succeeded_gross: number;
  payout_batches_succeeded_net: number;
  withheld_on_succeeded_batches: number;
  counts: {
    subscription_invoices_paid: number;
    subscription_invoices_unpaid: number;
    reservations_paid: number;
    commissions_pending: number;
    commissions_released: number;
    payout_batches_total: number;
  };
};

export type FinanceLedgerRow = {
  entry_type: "subscription" | "booking";
  entry_id: number;
  reference: string | null;
  resort_id: number;
  resort_name: string;
  amount: number;
  currency: string;
  status: string;
  referral_code: string | null;
  marketer_id: number | null;
  occurred_at: string | null;
  created_at: string;
};

export type FinanceCommissionsSummary = {
  pending_count: number;
  released_count: number;
  pending_gross: number;
  released_gross: number;
};

export type FinanceCommissionRow = {
  id: number;
  marketer_id: number;
  resort_id: number;
  period: string;
  commission_amount: string;
  status: string;
  payout_batch_id: number | null;
  marketer?: { id: number; name: string; email: string };
  resort?: { id: number; name: string };
  payout_batch?: {
    id: number;
    reference_id: string;
    status: string;
    total_amount: string;
    run_period: string;
  } | null;
};

export type FinanceWithholdingBatchRow = {
  id: number;
  marketer_id: number;
  marketer?: { id: number; name: string; email: string };
  run_period: string;
  reference_id: string;
  currency: string;
  status: string;
  gross_commissions: number;
  net_disbursed: number;
  withheld: number;
  withholding_rate_effective: number | null;
  xendit_payout_id: string | null;
  failure_message: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type FinanceWithholdingSummary = {
  all_batches_count: number;
  succeeded_gross: number;
  succeeded_net: number;
  succeeded_withheld: number;
};

export type CommissionReleaseRow = {
  id: number;
  commission_id: number;
  released_by: number | null;
  amount: string;
  notes: string | null;
  released_at: string;
  release_source: string;
  payout_batch_id: number | null;
  commission?: {
    marketer?: { id: number; name: string; email: string };
    resort?: { id: number; name: string };
  };
  released_by_user?: { id: number; name: string } | null;
  payout_batch?: { id: number; reference_id: string; status: string } | null;
};

type LaravelPaginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function normalizeLaravelPaginated<T>(raw: unknown): LaravelPaginated<T> {
  const r = raw as LaravelPaginated<T>;
  return {
    data: Array.isArray(r?.data) ? r.data : [],
    current_page: typeof r?.current_page === "number" ? r.current_page : 1,
    last_page: typeof r?.last_page === "number" ? r.last_page : 1,
    per_page: typeof r?.per_page === "number" ? r.per_page : 20,
    total: typeof r?.total === "number" ? r.total : 0,
  };
}

export async function getAdminFinanceOverview(): Promise<AdminFinanceOverview> {
  const { data } = await apiClient.get<ApiEnvelope<AdminFinanceOverview>>("/admin/finance/overview");
  return data.data;
}

export async function getAdminPaymentLedger(params?: {
  page?: number;
  per_page?: number;
  type?: "all" | "subscription" | "booking";
  from?: string;
  to?: string;
}): Promise<LaravelPaginated<FinanceLedgerRow>> {
  const { data } = await apiClient.get<ApiEnvelope<LaravelPaginated<FinanceLedgerRow>>>(
    "/admin/finance/payment-ledger",
    { params },
  );
  return normalizeLaravelPaginated<FinanceLedgerRow>(data.data);
}

export async function getAdminFinanceCommissions(params?: {
  page?: number;
  per_page?: number;
  status?: string;
}): Promise<{ summary: FinanceCommissionsSummary; commissions: LaravelPaginated<FinanceCommissionRow> }> {
  const { data } = await apiClient.get<
    ApiEnvelope<{ summary: FinanceCommissionsSummary; commissions: LaravelPaginated<FinanceCommissionRow> }>
  >("/admin/finance/commissions", { params });
  const payload = data.data;
  return {
    summary: payload.summary,
    commissions: normalizeLaravelPaginated<FinanceCommissionRow>(payload.commissions),
  };
}

export async function getAdminWithholdingBatches(params?: {
  page?: number;
  per_page?: number;
  status?: string;
}): Promise<{ summary: FinanceWithholdingSummary; batches: LaravelPaginated<FinanceWithholdingBatchRow> }> {
  const { data } = await apiClient.get<
    ApiEnvelope<{ summary: FinanceWithholdingSummary; batches: LaravelPaginated<FinanceWithholdingBatchRow> }>
  >("/admin/finance/withholding-batches", { params });
  const payload = data.data;
  return {
    summary: payload.summary,
    batches: normalizeLaravelPaginated<FinanceWithholdingBatchRow>(payload.batches),
  };
}

export async function getAdminCommissionReleases(params?: {
  page?: number;
  per_page?: number;
}): Promise<LaravelPaginated<CommissionReleaseRow>> {
  const { data } = await apiClient.get<ApiEnvelope<LaravelPaginated<CommissionReleaseRow>>>(
    "/admin/finance/commission-releases",
    { params },
  );
  return normalizeLaravelPaginated<CommissionReleaseRow>(data.data);
}

export type AdminMarketerMonitorRow = {
  id: number;
  name: string;
  email: string;
  referral_code: string | null;
  joined_at: string | null;
  assigned_resorts_count: number;
  referred_resorts_count: number;
  last_new_referred_resort_at: string | null;
  months_since_last_new_referred_resort: number | null;
  last_any_referral_payment_at: string | null;
  total_referred_subscription_php: number;
  commission_pending_php: number;
  commission_released_gross_php: number;
  commission_total_gross_php: number;
};

export type AdminMarketerMonitoringPayload = {
  rows: AdminMarketerMonitorRow[];
  meta: { generated_at: string; new_client_definition: string };
};

export async function getAdminMarketersMonitoring(search?: string): Promise<AdminMarketerMonitoringPayload> {
  const { data } = await apiClient.get<ApiEnvelope<AdminMarketerMonitoringPayload>>("/admin/marketers/monitoring", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });
  const raw = data.data;
  return {
    rows: Array.isArray(raw?.rows) ? raw.rows : [],
    meta: {
      generated_at: typeof raw?.meta?.generated_at === "string" ? raw.meta.generated_at : "",
      new_client_definition:
        typeof raw?.meta?.new_client_definition === "string" ? raw.meta.new_client_definition : "",
    },
  };
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
