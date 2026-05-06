import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

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
  return data.data;
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

export async function getSystemSettings(): Promise<SystemSetting[]> {
  const { data } = await apiClient.get<ApiEnvelope<SystemSetting[]>>("/admin/settings");
  return data.data;
}

export async function updateSystemSettings(settings: { key: string; value: string }[]): Promise<void> {
  await apiClient.put("/admin/settings", { settings });
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
  plan?: "standard" | "vip";
  is_publicly_listed?: boolean;
}) {
  const { data } = await apiClient.post("/admin/resorts/onboard", payload);
  return data.data;
}
