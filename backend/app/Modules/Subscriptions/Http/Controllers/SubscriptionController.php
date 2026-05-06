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
        $validated = $request->validate([
            // accept new frontend plan slugs: basic, premium, vip, standard
            'plan' => ['nullable', 'in:basic,premium,standard,vip'],
        ]);

        // map frontend plan slugs to internal plan identifiers as needed
        $plan = $validated['plan'] ?? 'standard';
        // normalize synonyms: basic/premium map to 'standard' pricing group vs vip
        if (in_array($plan, ['basic', 'premium', 'standard'], true)) {
            $internalPlan = $plan; // keep specific plan name for reporting, service will handle pricing
        } else {
            $internalPlan = $plan; // vip
        }

        $subscription = $this->service->refreshForResort($resort, $internalPlan);
        return $this->successResponse($subscription, 'Subscription refreshed');
    }

    public function enforceGracePeriod()
    {
        $updated = $this->service->applyGracePeriodRules();
        return $this->successResponse(['updated' => $updated], 'Subscription grace-period scan complete');
    }
}
