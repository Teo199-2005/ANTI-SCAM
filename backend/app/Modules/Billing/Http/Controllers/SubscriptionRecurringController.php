<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Modules\Billing\Services\XenditRecurringSubscriptionService;
use App\Modules\Billing\Support\SubscriptionBillingMode;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class SubscriptionRecurringController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly XenditRecurringSubscriptionService $recurring) {}

    public function cancel(Request $request, Resort $resort)
    {
        $this->authorizeResortAccess($request, $resort);

        $subscription = $resort->subscription()->first();
        if (! $subscription) {
            return $this->errorResponse('Subscription not found for this resort.', null, 404);
        }

        if (! SubscriptionBillingMode::recurringActive($subscription->billing_mode, $subscription->recurring_cancelled_at)) {
            return $this->errorResponse(
                'Auto-renewal is not active on this subscription.',
                ['billing_mode' => ['not_auto_card']],
                409
            );
        }

        $this->recurring->cancelRecurring($subscription);

        return $this->successResponse([
            'billing_mode' => $subscription->fresh()->billing_mode,
            'recurring_cancelled_at' => $subscription->fresh()->recurring_cancelled_at?->toIso8601String(),
        ], 'Auto-renewal cancelled. Your current billing period remains active until it ends.');
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
}
