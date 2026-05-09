<?php

namespace App\Modules\Subscriptions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly SubscriptionService $service) {}

    public function refresh(Request $request, Resort $resort)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }
        if ($user->role !== 'admin' && (int) $user->tenant_id !== (int) $resort->tenant_id) {
            abort(403, 'You are not allowed to access this resource.');
        }

        $validated = $request->validate([
            'plan' => ['nullable', 'in:basic'],
        ]);

        $plan = 'basic';
        $subscription = $this->service->refreshForResort($resort, $plan);
        return $this->successResponse($subscription, 'Subscription refreshed');
    }

    public function enforceGracePeriod()
    {
        $updated = $this->service->applyGracePeriodRules();
        return $this->successResponse(['updated' => $updated], 'Subscription grace-period scan complete');
    }
}
