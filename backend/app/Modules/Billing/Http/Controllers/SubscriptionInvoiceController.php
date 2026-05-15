<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\SubscriptionInvoice;
use App\Modules\Billing\Services\XenditSubscriptionInvoiceService;
use App\Modules\Billing\Services\XenditSubscriptionWebhookService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use RuntimeException;

class SubscriptionInvoiceController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly XenditSubscriptionInvoiceService $service,
        private readonly XenditSubscriptionWebhookService $subscriptionWebhook,
    ) {}

    /**
     * POST /resort-owner/subscriptions/pay-invoice
     * Same as {@see create} but resolves the resort from the authenticated owner’s tenant,
     * avoiding mismatches when the client URL used a stale or wrong resort id.
     */
    public function createForOwner(Request $request)
    {
        $resort = $this->resolveResortForAuthenticatedOwner($request);
        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        return $this->create($request, $resort);
    }

    public function index(Request $request, Resort $resort)
    {
        $this->authorizeResortAccess($request, $resort);

        $perPage = (int) $request->integer('perPage', 20);
        $invoices = SubscriptionInvoice::query()
            ->where('resort_id', $resort->id)
            ->latest('id')
            ->paginate($perPage);

        return $this->successResponse($invoices, 'Subscription invoices fetched');
    }

    public function create(Request $request, Resort $resort)
    {
        $this->authorizeResortAccess($request, $resort);

        $subscription = $resort->subscription()->first();
        if (! $subscription) {
            return $this->errorResponse('Subscription not found for this resort.', null, 404);
        }

        $billingScope = (string) $request->input('billing_scope', 'monthly');
        if (! in_array($billingScope, ['monthly', 'room_addon'], true)) {
            return $this->errorResponse('Invalid billing scope.', ['billing_scope' => ['invalid']], 422);
        }
        $durationMonths = (int) $request->integer('subscription_duration_months', 1);
        $allowedDurations = [1, 3, 6, 12];
        if (! in_array($durationMonths, $allowedDurations, true)) {
            return $this->errorResponse('Invalid subscription duration.', ['subscription_duration_months' => ['invalid']], 422);
        }
        $roomAddonQuantity = max(1, min(50, (int) $request->integer('room_addon_quantity', 1)));

        $isOverdue = $subscription->next_due_date && now()->toDateString() >= (string) $subscription->next_due_date;
        $isPayableStatus = in_array($subscription->status, ['pending_payment', 'active'], true);
        $isFirstOrPendingPayment = $subscription->status === 'pending_payment';
        $isAdmin = (string) $request->user()?->role === 'admin';
        $force = $isAdmin && (bool) $request->boolean('force', false);

        // Allow immediate payment for newly onboarded / pending-payment subscriptions.
        // Only enforce due-date checks for currently active subscriptions.
        if (
            $billingScope === 'monthly'
            && ! $force
            && (! $isPayableStatus || (! $isFirstOrPendingPayment && ! $isOverdue))
        ) {
            return $this->errorResponse(
                'Subscription is not due for payment yet.',
                ['subscription' => ['not_due']],
                409
            );
        }

        if (
            $billingScope === 'room_addon'
            && ! in_array((string) $subscription->status, ['active', 'pending_payment'], true)
        ) {
            return $this->errorResponse(
                'Room add-on payment is only available for active subscriptions.',
                ['subscription' => ['not_active']],
                409
            );
        }

        // Recover from local-only pending rows (e.g., scheduler-created placeholders).
        SubscriptionInvoice::query()
            ->where('subscription_id', $subscription->id)
            ->whereDate('billing_cycle_start', (string) $subscription->billing_cycle_start)
            ->whereDate('billing_cycle_end', (string) $subscription->billing_cycle_end)
            ->where('status', 'pending')
            ->whereNull('xendit_invoice_id')
            ->update(['status' => 'expired']);

        // Optional: restrict Xendit checkout to one payment method the resort owner chose
        $paymentMethod = $request->input('payment_method'); // e.g. 'GCASH', 'CREDIT_CARD'
        $paymentMethods = $paymentMethod ? [(string) $paymentMethod] : [];
        $referralCode = trim((string) $request->input('referral_code', ''));
        if ($referralCode !== '') {
            return $this->errorResponse(
                'Referral benefits are applied when you create your account at registration. Remove the referral code from checkout.',
                ['referral_code' => ['registration_only']],
                422
            );
        }

        $invoicePlanTag = $billingScope === 'room_addon'
            ? sprintf('%s_room_addon_q%d_m%d', $subscription->plan, $roomAddonQuantity, $durationMonths)
            : sprintf('%s_m%d_b0', (string) $subscription->plan, $durationMonths);

        $existingPendingGatewayInvoice = SubscriptionInvoice::query()
            ->where('subscription_id', $subscription->id)
            ->where('plan', $invoicePlanTag)
            ->where('status', 'pending')
            ->whereDate('billing_cycle_start', (string) $subscription->billing_cycle_start)
            ->whereDate('billing_cycle_end', (string) $subscription->billing_cycle_end)
            ->whereNotNull('xendit_invoice_id')
            ->latest('id')
            ->first();

        // Reuse an existing pending gateway invoice for this cycle
        // so users can continue payment instead of getting blocked by 409.
        if ($existingPendingGatewayInvoice) {
            if ($subscription->status !== 'pending_payment') {
                $subscription->update(['status' => 'pending_payment']);
            }

            return $this->successResponse([
                'invoice_url' => $existingPendingGatewayInvoice->xendit_invoice_url,
                'invoice_id' => $existingPendingGatewayInvoice->xendit_invoice_id,
                'subscription_invoice_id' => $existingPendingGatewayInvoice->id,
                'reused' => true,
            ], 'Existing pending subscription invoice reused');
        }

        // Mark pending_payment BEFORE calling the service so the status is correct
        // while the Xendit-hosted invoice is outstanding (real mode).
        // In mock/dev mode the service will immediately override this to 'active'.
        if ($billingScope === 'monthly') {
            $subscription->update(['status' => 'pending_payment']);
        }

        $checkoutReturnBase = $request->input('checkout_return_base');
        if (! is_string($checkoutReturnBase) || strlen($checkoutReturnBase) > 512) {
            $checkoutReturnBase = null;
        }

        try {
            $result = $this->service->createInvoice(
                $subscription,
                $paymentMethods,
                '',
                $billingScope,
                $roomAddonQuantity,
                null,
                null,
                $durationMonths,
                $checkoutReturnBase
            );
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), null, 502);
        }
        // Do NOT touch the status after this point — mock mode already set it to
        // 'active', and in real mode it stays 'pending_payment' until the webhook fires.

        return $this->successResponse([
            'invoice_url' => $result['invoice_url'],
            'invoice_id' => $result['invoice_id'],
            'subscription_invoice_id' => $result['subscription_invoice_id'],
        ], 'Subscription payment invoice created');
    }

    /**
     * After returning from Xendit checkout, webhooks may not reach local/dev servers.
     * Poll gateway for the latest pending invoice and apply the same update as the webhook.
     */
    public function syncPendingFromGateway(Request $request, Resort $resort)
    {
        $this->authorizeResortAccess($request, $resort);

        $invoice = SubscriptionInvoice::query()
            ->where('resort_id', $resort->id)
            ->where('status', 'pending')
            ->whereNotNull('xendit_invoice_id')
            ->latest('id')
            ->first();

        if (! $invoice) {
            return $this->successResponse([
                'synced' => false,
                'reason' => 'no_pending_invoice',
            ], 'No pending subscription invoice to sync.');
        }

        if (! $this->service->gatewayConfigured()) {
            return $this->successResponse([
                'synced' => false,
                'reason' => 'gateway_not_configured',
            ], 'Payment gateway is not configured.');
        }

        $gatewayStatus = $this->service->fetchXenditInvoiceStatus((string) $invoice->xendit_invoice_id);
        if ($gatewayStatus === null) {
            return $this->errorResponse('Could not verify payment with the gateway. Try again in a moment.', null, 502);
        }

        $paidStatuses = ['PAID', 'SETTLED'];
        if (! in_array($gatewayStatus, $paidStatuses, true)) {
            return $this->successResponse([
                'synced' => false,
                'gateway_status' => $gatewayStatus,
            ], 'Invoice is not marked paid yet.');
        }

        $this->subscriptionWebhook->handleInvoiceWebhook([
            'id' => $invoice->xendit_invoice_id,
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ]);

        return $this->successResponse(['synced' => true], 'Subscription updated from payment.');
    }

    private function authorizeResortAccess(Request $request, Resort $resort): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        if ($user->role === 'admin') {
            return;
        }

        if ($user->role !== 'resort_owner' || (int) $user->tenant_id !== (int) $resort->tenant_id) {
            abort(403, 'You are not allowed to access this resource.');
        }
    }

    private function resolveResortForAuthenticatedOwner(Request $request): ?Resort
    {
        $user = $request->user();
        if (! $user || $user->tenant_id === null) {
            return null;
        }

        return Resort::withoutGlobalScopes()
            ->with(['tenant', 'subscription', 'rooms.images'])
            ->where('tenant_id', $user->tenant_id)
            ->first();
    }
}
