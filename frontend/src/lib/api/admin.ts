import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { ResortItem } from "@/lib/api/resort";

export type AdminStats = {
  totalResorts: number;
  publicResorts: number;
  standardResorts?: number;
  businessProResorts?: number;
  subscriptionRevenueMonth?: number;
  expiringSubscriptions?: number;
  failedPayments?: number;
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

export type AdminLocationStatRow = {
  province_psgc?: string;
  province_name?: string;
  city_psgc?: string;
  city_name?: string;
  resort_count: number;
  owner_count: number;
};

export type AdminLocationTopResortRow = {
  location_label: string;
  resort_count: number;
};

export type AdminLocationStats = {
  by_province: AdminLocationStatRow[];
  by_city: AdminLocationStatRow[];
  top_resorts: AdminLocationTopResortRow[];
  filtered_totals: { resort_count: number; owner_count: number };
};

export async function getAdminLocationStats(params?: {
  province_psgc?: string | null;
  city_municipality_psgc?: string | null;
  /** Human province name from the SPA PSGC picker (helps admin charts when API reference tables are incomplete). */
  province_display?: string | null;
  city_display?: string | null;
}): Promise<AdminLocationStats> {
  const { data } = await apiClient.get<ApiEnvelope<AdminLocationStats>>("/admin/location-stats", {
    params: {
      province_psgc: params?.province_psgc ?? undefined,
      city_municipality_psgc: params?.city_municipality_psgc ?? undefined,
      province_display: params?.province_display ?? undefined,
      city_display: params?.city_display ?? undefined,
    },
  });
  const payload = data.data;
  return {
    ...payload,
    top_resorts: payload.top_resorts ?? [],
  };
}

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

export type SystemSettingsPayload = {
  settings: SystemSetting[];
  marketing_commission_policy_note?: string;
};

export async function getSystemSettings(): Promise<SystemSettingsPayload> {
  const { data } = await apiClient.get<
    ApiEnvelope<SystemSetting[] | { settings: SystemSetting[]; marketing_commission_policy_note?: string }>
  >("/admin/settings");
  const raw = data.data;
  if (Array.isArray(raw)) {
    return { settings: raw };
  }
  return {
    settings: raw.settings ?? [],
    marketing_commission_policy_note: raw.marketing_commission_policy_note,
  };
}

export async function updateSystemSettings(settings: { key: string; value: string }[]): Promise<string | undefined> {
  const { data } = await apiClient.put<
    ApiEnvelope<{ marketing_commission_policy_note?: string } | null>
  >("/admin/settings", { settings });
  return data.data?.marketing_commission_policy_note ?? data.message;
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

export async function getSuspensionList(params?: {
  filter?: string;
  perPage?: number;
  page?: number;
  province_psgc?: string | null;
  city_municipality_psgc?: string | null;
}): Promise<Paginated<SuspensionItem>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<SuspensionItem>>>("/admin/suspensions", { params });
  return data.data;
}

export async function setResortVip(resortId: number, isVip: boolean, reason?: string): Promise<void> {
  await apiClient.post(`/admin/resorts/${resortId}/vip`, { is_vip: isVip, reason });
}

export async function updateAdminResortLandingEmbed(
  resortId: number,
  payload: { admin_landing_embed_enabled: boolean; admin_landing_youtube_url?: string | null },
): Promise<{ admin_landing_embed_enabled: boolean; admin_landing_youtube_url: string | null }> {
  const { data } = await apiClient.patch<
    ApiEnvelope<{ admin_landing_embed_enabled: boolean; admin_landing_youtube_url: string | null }>
  >(`/admin/resorts/${resortId}/landing-embed`, payload);
  return data.data;
}

export async function adminOnboard(payload: {
  tenant_name: string;
  resort_name: string;
  subdomain: string;
  address_province_psgc?: string | null;
  address_city_municipality_psgc?: string | null;
  address_barangay_psgc?: string | null;
  address_barangay_name?: string | null;
  address_street_line?: string | null;
  address_label?: string | null;
  map_latitude?: number | null;
  map_longitude?: number | null;
  contact_number?: string | null;
  logo_url?: string | null;
  background_image_url?: string | null;
  description?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  representative_name?: string | null;
  representative_contact_number?: string | null;
  cancellation_policy?: string | null;
  amenities?: string[];
  plan?: "basic";
  owner_user_id?: number;
  owner_name?: string;
  owner_email?: string;
  owner_password?: string;
  owner_password_confirmation?: string;
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

export async function getAdminSubscriptionOverview(params?: {
  province_psgc?: string | null;
  city_municipality_psgc?: string | null;
}): Promise<AdminSubscriptionOverviewItem[]> {
  const { data } = await apiClient.get<ApiEnvelope<AdminSubscriptionOverviewItem[]>>(
    "/admin/subscriptions/overview",
    {
      params: {
        province_psgc: params?.province_psgc ?? undefined,
        city_municipality_psgc: params?.city_municipality_psgc ?? undefined,
      },
    },
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

export type AdminBookingCommissionOverview = {
  current_rate_php: number;
  enabled: boolean;
  ytd: {
    credits_count: number;
    credits_gross_php: number;
    reversals_count: number;
    reversals_gross_php: number;
    net_credited_php: number;
    marketers_active: number;
  };
  ledger: {
    booking_pending_gross_php: number;
    booking_released_gross_php: number;
    legacy_pending_gross_php: number;
    legacy_released_gross_php: number;
  };
  policy_note: string;
};

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
  booking_commissions?: AdminBookingCommissionOverview;
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
  marketer_tier?: string | null;
  unit_commission_php?: string | number | null;
  commission_source?: "booking_commission" | "subscription_legacy" | string;
  booking_count?: number | null;
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
  /** Rate stored when batch was created (for audit); may be null on legacy rows */
  withholding_rate_applied?: number | null;
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

export type AdminCompanyExecutive = {
  key: string;
  name: string;
  role_title: string;
  role_short: string;
  bio: string;
  amount_php_per_booking: number;
  qualifying_bookings: number;
  commission_total_php: number;
};

export type AdminCompanyAnalytics = {
  year: number;
  month: number | null;
  period_label: string;
  policy_note: string;
  marketer_booking_rate_php: number;
  marketer_commissions_enabled: boolean;
  executive_amount_php_per_booking: number;
  executive_count: number;
  executive_team_total_php: number;
  executives: AdminCompanyExecutive[];
  qualifying_bookings: { credits_count: number; reversals_count: number; net_count: number };
  guest_bookings: { paid_count: number; paid_total_php: number };
  subscription_inflows_paid_php: number;
  marketer_booking_commissions: {
    credits_gross_php: number;
    reversals_gross_php: number;
    net_credited_php: number;
  };
  estimated_platform_retention_from_bookings_php: number;
  waterfall: Array<{ key: string; label: string; amount_php: number; kind: "inflow" | "outflow" | "summary" }>;
  monthly_executive_accrual: Array<{ period: string; qualifying_bookings: number; team_total_php: number }>;
};

export async function getAdminCompanyAnalytics(params?: {
  year?: number;
  month?: number;
}): Promise<AdminCompanyAnalytics> {
  const { data } = await apiClient.get<ApiEnvelope<AdminCompanyAnalytics>>("/admin/analytics/company", {
    params,
  });
  return data.data;
}

export async function getAdminBookingCommissionAnalytics(year?: number): Promise<AdminBookingCommissionAnalytics> {
  const { data } = await apiClient.get<ApiEnvelope<AdminBookingCommissionAnalytics>>(
    "/admin/marketing/booking-commissions/analytics",
    { params: year != null ? { year } : {} },
  );
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
  avatar_url?: string | null;
  referral_code: string | null;
  joined_at: string | null;
  assigned_resorts_count: number;
  /** Distinct owner orgs (tenants) with qualifying referral subscription payments — drives tier. */
  referred_clients_count: number;
  /** Distinct resorts that have had such a payment (can exceed clients). */
  referred_resorts_count: number;
  last_new_referred_resort_at: string | null;
  months_since_last_new_referred_resort: number | null;
  last_any_referral_payment_at: string | null;
  total_referred_subscription_php: number;
  commission_pending_php: number;
  commission_released_gross_php: number;
  commission_total_gross_php: number;
  booking_credits_count: number;
  booking_reversals_count: number;
  booking_credits_gross_php: number;
  current_commission_per_booking_php: number;
};

export type AdminBookingCommissionAnalytics = {
  year: number;
  current_rate_php: number;
  commissions_enabled: boolean;
  policy_note: string;
  totals: {
    credits_count: number;
    credits_gross_php: number;
    reversals_count: number;
    reversals_gross_php: number;
    net_credited_php: number;
    marketers_active: number;
  };
  monthly: Array<{
    period: string;
    credits_count: number;
    credits_gross_php: number;
    reversals_count: number;
    reversals_gross_php: number;
    net_credited_php: number;
  }>;
  top_marketers: Array<{
    marketer_id: number;
    marketer_name: string;
    marketer_email: string;
    credits_count: number;
    credits_gross_php: number;
  }>;
  commission_ledger: {
    booking_pending_gross_php: number;
    booking_released_gross_php: number;
    legacy_pending_gross_php: number;
    legacy_released_gross_php: number;
  };
};

export type AdminTierLadderRow = {
  tier_key: string;
  label: string;
  min_clients: number;
  max_clients: number | null;
  per_payment_php: number;
  client_range_label: string;
};

export type AdminMarketerMonitoringPayload = {
  rows: AdminMarketerMonitorRow[];
  meta: {
    generated_at: string;
    new_client_definition: string;
    booking_commission_policy?: string;
    commission_per_booking_php?: number;
    tier_ladder?: AdminTierLadderRow[];
    tier_policy?: string;
  };
};

export type AdminMarketerDetailClient = {
  source: "paid_subscription" | "signup_trial";
  tenant_id: number | null;
  tenant_name: string;
  tenant_slug: string;
  owner_name: string | null;
  owner_email: string | null;
  first_qualifying_paid_at: string | null;
  last_qualifying_paid_at: string | null;
  qualifying_subscription_invoices: number;
  referred_resorts_count: number;
  total_subscription_volume_php: number;
  trial_ends_at: string | null;
  referral_code: string | null;
  trial_active: boolean;
  referred_user_id: number | null;
};

export type AdminMarketerProfileDetail = {
  phone: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  mailing_province_psgc: string | null;
  mailing_city_municipality_psgc: string | null;
  mailing_barangay_name: string | null;
  mailing_location_label: string | null;
  marketer_mailing_address: string | null;
  marketer_tin_masked: string | null;
  marketer_gov_id_type: string | null;
  marketer_gov_id_label: string | null;
  marketer_gov_id_number_masked: string | null;
  marketer_gov_id_has_number: boolean;
  marketer_gov_id_document_url: string | null;
  marketer_gov_id_complete: boolean;
  gcash_masked_number: string | null;
  gcash_account_holder_name: string | null;
  gcash_payout_configured: boolean;
  marketer_bank_name: string | null;
  marketer_bank_branch: string | null;
  marketer_bank_account_name: string | null;
  marketer_bank_account_masked: string | null;
  billing_xendit_mode: "live" | "test" | "unset";
  marketing_payout_automation_enabled: boolean;
};

export type AdminMarketerDetailBookingCommission = {
  id: number;
  type: string;
  amount_php: number;
  period: string;
  resort_id: number | null;
  resort_name: string | null;
  reservation_id: number | null;
  reference_no: string | null;
  reserved_at: string | null;
  reservation_status: string | null;
  created_at: string | null;
};

export type AdminMarketerDetailTransaction = {
  id: number;
  resort_id: number | null;
  resort_name: string | null;
  tenant_id: number | null;
  tenant_name: string | null;
  plan: string | null;
  is_room_addon: boolean;
  amount_php: number;
  status: string;
  paid_at: string | null;
  referral_code: string | null;
  acknowledgment_receipt_no: string | null;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
};

export type AdminMarketerDetailPayload = {
  marketer: {
    id: number;
    name: string;
    email: string;
    referral_code: string | null;
    joined_at: string | null;
    assigned_resorts_count: number;
    referral_signup_clients_count: number;
    qualifying_bookings_count: number;
    booking_reversals_count: number;
    booking_credits_gross_php: number;
    current_commission_per_booking_php: number;
    commission_pending_php: number;
    commission_released_gross_php: number;
    commission_total_gross_php: number;
    profile: AdminMarketerProfileDetail;
  };
  clients: AdminMarketerDetailClient[];
  clients_meta: {
    total: number;
    paid_converting: number;
    signup_trial: number;
  };
  transactions: AdminMarketerDetailTransaction[];
  transactions_meta: {
    total: number;
    definition: string;
  };
  booking_commissions: AdminMarketerDetailBookingCommission[];
  booking_commissions_meta: {
    total: number;
    definition: string;
  };
};

export async function getAdminMarketerDetail(marketerId: number): Promise<AdminMarketerDetailPayload> {
  const { data } = await apiClient.get<ApiEnvelope<AdminMarketerDetailPayload>>(
    `/admin/marketers/${marketerId}/detail`,
  );
  return data.data;
}

export async function getAdminMarketersMonitoring(
  search?: string,
  location?: { province_psgc?: string | null; city_municipality_psgc?: string | null },
): Promise<AdminMarketerMonitoringPayload> {
  const { data } = await apiClient.get<ApiEnvelope<AdminMarketerMonitoringPayload>>("/admin/marketers/monitoring", {
    params: {
      ...(search?.trim() ? { search: search.trim() } : {}),
      province_psgc: location?.province_psgc ?? undefined,
      city_municipality_psgc: location?.city_municipality_psgc ?? undefined,
    },
  });
  const raw = data.data;
  const meta = raw?.meta && typeof raw.meta === "object" ? (raw.meta as Record<string, unknown>) : {};
  return {
    rows: Array.isArray(raw?.rows) ? (raw.rows as AdminMarketerMonitorRow[]) : [],
    meta: {
      generated_at: typeof meta.generated_at === "string" ? meta.generated_at : "",
      new_client_definition: typeof meta.new_client_definition === "string" ? meta.new_client_definition : "",
      booking_commission_policy:
        typeof meta.booking_commission_policy === "string" ? meta.booking_commission_policy : undefined,
      commission_per_booking_php:
        typeof meta.commission_per_booking_php === "number" ? meta.commission_per_booking_php : undefined,
      tier_ladder: Array.isArray(meta.tier_ladder) ? (meta.tier_ladder as AdminTierLadderRow[]) : undefined,
      tier_policy: typeof meta.tier_policy === "string" ? meta.tier_policy : undefined,
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
    { timeout: 120_000, maxBodyLength: Infinity, maxContentLength: Infinity },
  );
  return data.data.logo_url;
}

export async function uploadResortBackground(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.post<ApiEnvelope<{ background_image_url: string }>>(
    "/admin/resorts/onboard/upload-background",
    form,
    { timeout: 180_000, maxBodyLength: Infinity, maxContentLength: Infinity },
  );
  return data.data.background_image_url;
}
