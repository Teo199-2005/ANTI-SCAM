<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\SubscriptionInvoice;
use App\Modules\Billing\Services\XenditRecurringSubscriptionService;
use App\Modules\Billing\Services\XenditSubscriptionInvoiceService;
use App\Modules\Billing\Services\XenditSubscriptionWebhookService;
use App\Modules\Billing\Support\SubscriptionInvoicePlanTag;
use App\Modules\Billing\Support\XenditCheckoutUrl;
use App\Support\SubscriptionPlan;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use RuntimeException;

class SubscriptionInvoiceController extends Controller
{
  use ApiResponseTrait;

  public function __construct(
    private readonly XenditSubscriptionInvoiceService $service,
    private readonly XenditSubscriptionWebhookService $subscriptionWebhook,
    private readonly XenditRecurringSubscriptionService $recurring,
  ) {}

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
    if ($billingScope === 'room_addon') {
      return $this->errorResponse(
        'Room add-on billing is no longer available. Upgrade to Business Pro for up to 20 rooms.',
        ['billing_scope' => ['deprecated']],
        422
      );
    }

    if ($billingScope !== 'monthly') {
      return $this->errorResponse('Invalid billing scope.', ['billing_scope' => ['invalid']], 422);
    }

    $durationMonths = 1;
    $roomAddonQuantity = 1;

    if (SubscriptionPlan::normalize($subscription->plan) === SubscriptionPlan::BUSINESS_PRO) {
      $isOverdue = $subscription->next_due_date && now()->toDateString() >= (string) $subscription->next_due_date;
      $status = (string) $subscription->status;
      $isAdmin = (string) $request->user()?->role === 'admin';
      $force = $isAdmin && (bool) $request->boolean('force', false);

      if (! $force && $status === 'active' && ! $isOverdue && ! in_array($status, ['grace_period'], true)) {
        return $this->errorResponse(
          'Business Pro is already active and not due for renewal.',
          ['subscription' => ['not_due']],
          409
        );
      }
    }

    SubscriptionInvoice::query()
      ->where('subscription_id', $subscription->id)
      ->where('status', 'pending')
      ->whereNull('xendit_invoice_id')
      ->update(['status' => 'expired']);

    $paymentMethod = $request->input('payment_method');
    if ($paymentMethod !== null && $paymentMethod !== '') {
      $paymentMethod = strtoupper(trim((string) $paymentMethod));
    } else {
      $paymentMethod = null;
    }

    $isAdmin = (string) $request->user()?->role === 'admin';
    $force = $isAdmin && (bool) $request->boolean('force', false);

    // Omit payment_method to let Xendit checkout show all methods enabled on the account.
    $paymentMethods = $this->recurring->resolveCheckoutPaymentMethods($paymentMethod);
    $setupRecurring = $this->recurring->shouldSetupRecurringOnCheckout($paymentMethod, $billingScope);

    $invoicePlanTag = SubscriptionInvoicePlanTag::businessProMonthly($setupRecurring);

    $existingPendingGatewayInvoice = SubscriptionInvoice::query()
      ->where('subscription_id', $subscription->id)
      ->where('plan', $invoicePlanTag)
      ->where('status', 'pending')
      ->whereNotNull('xendit_invoice_id')
      ->latest('id')
      ->first();

    if ($existingPendingGatewayInvoice) {
      if ($this->service->pendingInvoiceShouldBeReplaced(
        $existingPendingGatewayInvoice,
        $subscription,
        $billingScope,
        $roomAddonQuantity,
        $durationMonths
      )) {
        $existingPendingGatewayInvoice->update(['status' => 'expired']);
        $existingPendingGatewayInvoice = null;
      }
    }

    if ($existingPendingGatewayInvoice) {
      $reuseUrl = (string) ($existingPendingGatewayInvoice->xendit_invoice_url ?? '');
      if (! XenditCheckoutUrl::isValid($reuseUrl)) {
        $existingPendingGatewayInvoice->update(['status' => 'expired']);
        $existingPendingGatewayInvoice = null;
      } else {
        return $this->successResponse([
          'invoice_url' => $reuseUrl,
          'invoice_id' => $existingPendingGatewayInvoice->xendit_invoice_id,
          'subscription_invoice_id' => $existingPendingGatewayInvoice->id,
          'reused' => true,
        ], 'Existing pending subscription invoice reused');
      }
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
        $checkoutReturnBase,
        $setupRecurring,
        'checkout',
      );
    } catch (RuntimeException $e) {
      return $this->errorResponse($e->getMessage(), null, 502);
    }

    return $this->successResponse([
      'invoice_url' => $result['invoice_url'],
      'invoice_id' => $result['invoice_id'],
      'subscription_invoice_id' => $result['subscription_invoice_id'],
    ], 'Business Pro payment invoice created');
  }

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

    $paidInvoice = $this->subscriptionWebhook->handleInvoiceWebhook([
      'id' => $invoice->xendit_invoice_id,
      'status' => 'PAID',
      'event' => 'invoice.paid',
    ]);

    if ($paidInvoice) {
      $this->recurring->activateRecurringAfterFirstPaid($paidInvoice);
    }

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
