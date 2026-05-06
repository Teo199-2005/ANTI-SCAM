import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type MarketingStats = {
  totalCommissions: number;
  pendingCommissions: number;
  releasedCommissions: number;
  assignedResorts: number;
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

export async function getMarketingStats(): Promise<MarketingStats> {
  const { data } = await apiClient.get<ApiEnvelope<MarketingStats>>("/dashboard/marketing/stats");
  return data.data;
}

export async function getAssignedResorts(): Promise<AssignedResort[]> {
  const { data } = await apiClient.get<ApiEnvelope<AssignedResort[]>>("/dashboard/marketing/resorts");
  return data.data;
}

export async function getCommissions(params?: { page?: number; perPage?: number }): Promise<Paginated<Commission>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<Commission>>>("/dashboard/marketing/commissions", { params });
  return data.data;
}

export async function getReleaseHistory(params?: { page?: number; perPage?: number }): Promise<Paginated<CommissionRelease>> {
  const { data } = await apiClient.get<ApiEnvelope<Paginated<CommissionRelease>>>("/dashboard/marketing/releases", { params });
  return data.data;
}
