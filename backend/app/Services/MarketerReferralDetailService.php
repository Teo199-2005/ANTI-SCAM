<?php

namespace App\Services;

use App\Models\MarketerBookingCommissionEvent;
use App\Models\ReferralSignupAttribution;
use App\Models\SubscriptionInvoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class MarketerReferralDetailService
{
    /**
     * Resort-owner clients (paid conversions + signup trials) for a marketer.
     *
     * @return list<array<string, mixed>>
     */
    public function clientsForMarketer(int $marketerId): array
    {
        $paidTenantIds = DB::table('subscription_invoices as si')
            ->where('si.marketer_id', $marketerId)
            ->where('si.status', 'paid')
            ->whereNotNull('si.paid_at')
            ->whereNotNull('si.tenant_id')
            ->where(function ($q): void {
                $q->whereNull('si.plan')->orWhere('si.plan', 'not like', '%_room_addon%');
            })
            ->distinct()
            ->pluck('si.tenant_id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $clients = [];

        $aggRows = DB::table('subscription_invoices as si')
            ->where('si.marketer_id', $marketerId)
            ->where('si.status', 'paid')
            ->whereNotNull('si.paid_at')
            ->whereNotNull('si.tenant_id')
            ->where(function ($q): void {
                $q->whereNull('si.plan')->orWhere('si.plan', 'not like', '%_room_addon%');
            })
            ->groupBy('si.tenant_id')
            ->selectRaw(
                'si.tenant_id, MIN(si.paid_at) as first_paid_at, MAX(si.paid_at) as last_paid_at, COUNT(*) as qualifying_invoice_count, COUNT(DISTINCT si.resort_id) as resort_count, SUM(si.amount) as total_subscription_php'
            )
            ->get();

        $tenantIds = $aggRows->pluck('tenant_id')->map(static fn ($id): int => (int) $id)->all();
        $tenants = DB::table('tenants')->whereIn('id', $tenantIds)->get()->keyBy('id');
        $owners = User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->where('role', 'resort_owner')
            ->orderBy('id')
            ->get()
            ->unique('tenant_id')
            ->keyBy('tenant_id');

        foreach ($aggRows as $row) {
            $tenantId = (int) $row->tenant_id;
            $tenant = $tenants->get($tenantId);
            $owner = $owners->get($tenantId);
            $lastAt = Carbon::parse((string) $row->last_paid_at);

            $clients[] = [
                'source' => 'paid_subscription',
                'sort_at' => $lastAt->timestamp,
                'tenant_id' => $tenantId,
                'tenant_name' => (string) ($tenant->name ?? 'Resort owner'),
                'tenant_slug' => (string) ($tenant->slug ?? ''),
                'owner_name' => $owner?->name,
                'owner_email' => $owner?->email,
                'first_qualifying_paid_at' => Carbon::parse((string) $row->first_paid_at)->toIso8601String(),
                'last_qualifying_paid_at' => $lastAt->toIso8601String(),
                'qualifying_subscription_invoices' => (int) $row->qualifying_invoice_count,
                'referred_resorts_count' => (int) $row->resort_count,
                'total_subscription_volume_php' => round((float) $row->total_subscription_php, 2),
                'trial_ends_at' => null,
                'referral_code' => null,
                'trial_active' => false,
                'referred_user_id' => null,
            ];
        }

        $signupRows = ReferralSignupAttribution::query()
            ->where('marketer_id', $marketerId)
            ->with(['referredUser', 'tenant'])
            ->orderByDesc('trial_starts_at')
            ->get();

        foreach ($signupRows as $signup) {
            if ($signup->tenant_id !== null && in_array((int) $signup->tenant_id, $paidTenantIds, true)) {
                continue;
            }

            $owner = $signup->referredUser;
            $clients[] = [
                'source' => 'signup_referral',
                'sort_at' => $signup->trial_starts_at->timestamp,
                'tenant_id' => $signup->tenant_id,
                'tenant_name' => $signup->tenant?->name ?? ($owner?->name ?? 'Resort owner'),
                'tenant_slug' => $signup->tenant?->slug ?? '',
                'owner_name' => $owner?->name,
                'owner_email' => $owner?->email,
                'first_qualifying_paid_at' => null,
                'last_qualifying_paid_at' => null,
                'qualifying_subscription_invoices' => 0,
                'referred_resorts_count' => $signup->tenant_id !== null ? 1 : 0,
                'total_subscription_volume_php' => 0.0,
                'trial_ends_at' => null,
                'referral_code' => $signup->referral_code,
                'trial_active' => false,
                'referred_user_id' => $signup->referred_user_id,
                'referred_at' => $signup->trial_starts_at->toIso8601String(),
            ];
        }

        usort($clients, static fn (array $a, array $b): int => $b['sort_at'] <=> $a['sort_at']);
        foreach ($clients as &$row) {
            unset($row['sort_at']);
        }
        unset($row);

        return $clients;
    }

    /**
     * Subscription invoices attributed to the marketer (newest first).
     *
     * @return list<array<string, mixed>>
     */
    public function subscriptionTransactionsForMarketer(int $marketerId, int $limit = 100): array
    {
        $rows = SubscriptionInvoice::query()
            ->with(['resort:id,name'])
            ->where('marketer_id', $marketerId)
            ->orderByRaw('COALESCE(paid_at, created_at) DESC')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $tenantIds = $rows->pluck('tenant_id')->filter()->unique()->map(static fn ($id): int => (int) $id)->all();
        $tenants = $tenantIds !== []
            ? DB::table('tenants')->whereIn('id', $tenantIds)->get()->keyBy('id')
            : collect();

        $transactions = [];
        foreach ($rows as $invoice) {
            $tenantId = $invoice->tenant_id !== null ? (int) $invoice->tenant_id : null;
            $tenant = $tenantId !== null ? $tenants->get($tenantId) : null;
            $isRoomAddon = str_contains((string) $invoice->plan, '_room_addon');

            $transactions[] = [
                'id' => $invoice->id,
                'resort_id' => $invoice->resort_id,
                'resort_name' => $invoice->resort?->name,
                'tenant_id' => $tenantId,
                'tenant_name' => $tenant ? (string) $tenant->name : null,
                'plan' => $invoice->plan,
                'is_room_addon' => $isRoomAddon,
                'amount_php' => round((float) $invoice->amount, 2),
                'status' => $invoice->status,
                'paid_at' => $invoice->paid_at?->toIso8601String(),
                'referral_code' => $invoice->referral_code,
                'acknowledgment_receipt_no' => $invoice->acknowledgment_receipt_no,
                'billing_cycle_start' => $invoice->billing_cycle_start?->toDateString(),
                'billing_cycle_end' => $invoice->billing_cycle_end?->toDateString(),
            ];
        }

        return $transactions;
    }

    /**
     * Booking commission credits and reversals for a marketer (newest first).
     *
     * @return list<array<string, mixed>>
     */
    public function bookingCommissionsForMarketer(int $marketerId, int $limit = 100): array
    {
        $rows = MarketerBookingCommissionEvent::query()
            ->with([
                'resort:id,name',
                'reservation:id,reference_no,reserved_at,status',
            ])
            ->where('marketer_id', $marketerId)
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $event) {
            $reservation = $event->reservation;
            $out[] = [
                'id' => $event->id,
                'type' => $event->type,
                'amount_php' => round((float) $event->amount, 2),
                'period' => $event->period,
                'resort_id' => $event->resort_id,
                'resort_name' => $event->resort?->name,
                'reservation_id' => $event->reservation_id,
                'reference_no' => $reservation?->reference_no,
                'reserved_at' => $reservation?->reserved_at?->toIso8601String(),
                'reservation_status' => $reservation?->status,
                'created_at' => $event->created_at?->toIso8601String(),
            ];
        }

        return $out;
    }
}
