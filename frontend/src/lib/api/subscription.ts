import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

type SubscriptionInvoicePayload = {
  id: number;
  xendit_invoice_id: string | null;
  xendit_invoice_url?: string | null;
  amount: string;
  plan: string;
  status: "pending" | "paid" | "failed" | "expired";
  billing_cycle_start: string;
  billing_cycle_end: string;
  paid_at: string | null;
  created_at: string;
};

export type SubscriptionInvoice = {
  id: number;
  xenditInvoiceId: string | null;
  xenditInvoiceUrl: string | null;
  amount: string;
  plan: string;
  status: "pending" | "paid" | "failed" | "expired";
  billingCycleStart: string;
  billingCycleEnd: string;
  paidAt: string | null;
  createdAt: string;
};

function normalizeInvoice(raw: SubscriptionInvoicePayload): SubscriptionInvoice {
  return {
    id: raw.id,
    xenditInvoiceId: raw.xendit_invoice_id,
    xenditInvoiceUrl: raw.xendit_invoice_url ?? null,
    amount: raw.amount,
    plan: raw.plan,
    status: raw.status,
    billingCycleStart: raw.billing_cycle_start,
    billingCycleEnd: raw.billing_cycle_end,
    paidAt: raw.paid_at,
    createdAt: raw.created_at,
  };
}

export async function createSubscriptionInvoice(
  resortId: number,
  force = false,
  paymentMethod?: string,
  referralCode?: string,
  billingScope?: "monthly" | "room_addon",
  roomAddonQuantity?: number,
  subscriptionDurationMonths?: 1 | 3 | 6 | 12,
  /** Same host as the dashboard session (e.g. window.location.origin) so Xendit returns to the correct cookie jar. */
  checkoutReturnBase?: string,
): Promise<{ invoice_url: string }> {
  const { data } = await apiClient.post<ApiEnvelope<{ invoice_url: string }>>(
    `/resorts/${resortId}/subscriptions/pay-invoice`,
    {
      force,
      payment_method: paymentMethod ?? null,
      referral_code: referralCode ?? null,
      billing_scope: billingScope ?? "monthly",
      room_addon_quantity: roomAddonQuantity ?? 1,
      subscription_duration_months: subscriptionDurationMonths ?? 1,
      checkout_return_base: checkoutReturnBase ?? null,
    },
  );
  return data.data;
}

export async function triggerSubscriptionInvoice(
  resortId: number,
): Promise<{ invoice_url: string }> {
  const { data } = await apiClient.post<ApiEnvelope<{ invoice_url: string }>>(
    `/admin/resorts/${resortId}/subscriptions/trigger-invoice`,
    { force: true },
  );
  return data.data;
}

export async function getSubscriptionInvoices(resortId: number): Promise<SubscriptionInvoice[]> {
  const { data } = await apiClient.get<ApiEnvelope<{ data: SubscriptionInvoicePayload[] }>>(
    `/resorts/${resortId}/subscriptions/invoices`,
    { params: { perPage: 100 } },
  );
  return (data.data?.data ?? []).map(normalizeInvoice);
}

/** After Xendit redirect: poll gateway when webhooks do not reach the server (e.g. local dev). */
export async function syncPendingSubscriptionInvoice(
  resortId: number,
): Promise<{ synced: boolean; reason?: string; gateway_status?: string }> {
  const { data } = await apiClient.post<
    ApiEnvelope<{ synced: boolean; reason?: string; gateway_status?: string }>
  >(`/resorts/${resortId}/subscriptions/sync-invoice`);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Could not sync subscription payment.");
  }
  return data.data;
}

