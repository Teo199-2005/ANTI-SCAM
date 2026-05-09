import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type MarketingAnalyticsTotals = {
  commission_pending_ytd: number;
  commission_released_ytd: number;
  referral_subscription_count_ytd: number;
  referral_subscription_volume_ytd: number;
};

export type MarketingMonthlyAnalytics = {
  period: string;
  commission_pending: number;
  commission_released: number;
  referral_payment_count: number;
  referral_payment_volume: number;
};

export type MarketingResortAnalyticsRow = {
  resort_id: number;
  resort_name: string;
  commission_total: number;
  commission_pending: number;
  commission_released: number;
};

export type MarketingAnalyticsPayload = {
  year: number;
  monthly: MarketingMonthlyAnalytics[];
  by_resort: MarketingResortAnalyticsRow[];
  totals: MarketingAnalyticsTotals;
};

export type MarketingStats = {
  totalCommissions: number;
  pendingCommissions: number;
  /** Estimated GCash disbursement for current pending rows after withholding */
  pendingPayoutNetEstimate: number;
  /** Sum of release amounts actually paid (net for Xendit; gross for manual admin releases) */
  releasedCommissions: number;
  releasedCommissionsGross: number;
  payoutWithholdingRate: number;
  assignedResorts: number;
  referral_code: string | null;
  referral_share_register_url: string | null;
  referral_subscribe_hint: string | null;
  commission_payout_schedule?: string | null;
};

export type AssignedResort = {
  id: number;
  name: string;
  address: string | null;
  is_publicly_listed: boolean;
  is_vip: boolean;
};

export type Commission = {
  id: number;
  period: string;
  grossBookings: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "released";
  resort: { id: number; name: string } | null;
  releases: CommissionRelease[];
};

export type CommissionRelease = {
  id: number;
  amount: number;
  notes: string | null;
  released_at: string;
  released_by_user?: { id: number; name: string } | null;
};

type Paginated<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
};

function mapStats(raw: Record<string, unknown>): MarketingStats {
  return {
    totalCommissions: Number(raw.totalCommissions ?? raw.total_commissions ?? 0),
    pendingCommissions: Number(raw.pendingCommissions ?? raw.pending_commissions ?? 0),
    pendingPayoutNetEstimate: Number(raw.pendingPayoutNetEstimate ?? raw.pending_payout_net_estimate ?? 0),
    releasedCommissions: Number(raw.releasedCommissions ?? raw.released_commissions ?? 0),
    releasedCommissionsGross: Number(raw.releasedCommissionsGross ?? raw.released_commissions_gross ?? 0),
    payoutWithholdingRate: Number(raw.payoutWithholdingRate ?? raw.payout_withholding_rate ?? 0),
    assignedResorts: Number(raw.assignedResorts ?? raw.assigned_resorts ?? 0),
    referral_code: (raw.referral_code as string | null) ?? null,
    referral_share_register_url: (raw.referral_share_register_url as string | null) ?? null,
    referral_subscribe_hint: (raw.referral_subscribe_hint as string | null) ?? null,
    commission_payout_schedule: (raw.commission_payout_schedule as string | null) ?? null,
  };
}

export async function getMarketingAnalytics(year?: number): Promise<MarketingAnalyticsPayload> {
  const { data } = await apiClient.get<ApiEnvelope<MarketingAnalyticsPayload>>("/dashboard/marketing/analytics", {
    params: year != null ? { year } : {},
  });
  return data.data;
}

export async function getMarketingStats(): Promise<MarketingStats> {
  const { data } = await apiClient.get<ApiEnvelope<Record<string, unknown>>>("/dashboard/marketing/stats");
  return mapStats(data.data);
}

export async function getAssignedResorts(): Promise<AssignedResort[]> {
  const { data } = await apiClient.get<ApiEnvelope<AssignedResort[]>>("/dashboard/marketing/resorts");
  return data.data;
}

function mapCommission(raw: Record<string, unknown>): Commission {
  const resort = raw.resort as Record<string, unknown> | null | undefined;
  return {
    id: Number(raw.id),
    period: String(raw.period ?? ""),
    grossBookings: Number(raw.gross_bookings ?? raw.grossBookings ?? 0),
    commissionRate: Number(raw.commission_rate ?? raw.commissionRate ?? 0),
    commissionAmount: Number(raw.commission_amount ?? raw.commissionAmount ?? 0),
    status: (raw.status as Commission["status"]) ?? "pending",
    resort: resort && resort.id != null ? { id: Number(resort.id), name: String(resort.name ?? "") } : null,
    releases: (raw.releases as Commission["releases"]) ?? [],
  };
}

export async function getCommissions(params?: { page?: number; perPage?: number }): Promise<Paginated<Commission>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<Record<string, unknown>>>>("/dashboard/marketing/commissions", {
    params,
  });
  const payload = data.data;
  return {
    ...payload,
    data: (payload.data ?? []).map(mapCommission),
  };
}

function mapRelease(raw: Record<string, unknown>): CommissionRelease {
  return {
    id: Number(raw.id),
    amount: Number(raw.amount ?? 0),
    notes: (raw.notes as string | null) ?? null,
    released_at: String(raw.released_at ?? ""),
    released_by_user: raw.released_by_user as CommissionRelease["released_by_user"],
  };
}

export async function getReleaseHistory(params?: { page?: number; perPage?: number }): Promise<Paginated<CommissionRelease>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<Record<string, unknown>>>>("/dashboard/marketing/releases", { params });
  const payload = data.data;
  return {
    ...payload,
    data: (payload.data ?? []).map(mapRelease),
  };
}
