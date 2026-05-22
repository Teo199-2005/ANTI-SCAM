<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserSubscriptionController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly SubscriptionService $subscriptions) {}

    public function show(User $user)
    {
        if ($user->role !== 'resort_owner') {
            return $this->errorResponse('Subscription editing applies to resort owners only.', null, 422);
        }

        $resort = $this->primaryResortForUser($user);
        if (! $resort) {
            return $this->successResponse(null, 'No resort workspace for this user');
        }

        $subscription = $this->subscriptionForResort($resort);

        return $this->successResponse([
            'resort_id' => $resort->id,
            'resort_name' => $resort->name,
            'subscription' => $subscription ? $this->subscriptionPayload($subscription) : null,
        ], 'User subscription fetched');
    }

    public function update(Request $request, User $user)
    {
        if ($user->role !== 'resort_owner') {
            return $this->errorResponse('Subscription editing applies to resort owners only.', null, 422);
        }

        $data = $request->validate([
            'plan' => ['required', Rule::in(SubscriptionPlan::ALL)],
            'status' => ['required', Rule::in(['active', 'pending_payment', 'grace_period', 'suspended', 'cancelled', 'expired'])],
            'next_due_date' => ['nullable', 'date'],
            'billing_cycle_end' => ['nullable', 'date'],
        ]);

        $resort = $this->primaryResortForUser($user);
        if (! $resort) {
            return $this->errorResponse('This user has no resort workspace yet.', null, 422);
        }

        $subscription = $this->subscriptionForResort($resort);
        if (! $subscription) {
            $subscription = $this->subscriptions->refreshForResort($resort, SubscriptionPlan::STANDARD, activateIfNew: true);
        }

        $plan = SubscriptionPlan::normalize($data['plan']);
        if ($plan === SubscriptionPlan::BUSINESS_PRO) {
            $this->subscriptions->upgradeToBusinessPro($subscription);
            $subscription->refresh();
        } elseif ($plan === SubscriptionPlan::STANDARD) {
            $this->subscriptions->downgradeToStandard($subscription);
            $subscription->refresh();
        } else {
            SubscriptionPlan::applyPlanToSubscription($subscription, $plan);
            $subscription->save();
        }

        $updates = ['status' => $data['status']];
        if (array_key_exists('next_due_date', $data)) {
            $updates['next_due_date'] = $data['next_due_date'];
        }
        if (array_key_exists('billing_cycle_end', $data)) {
            $updates['billing_cycle_end'] = $data['billing_cycle_end'];
        }
        $subscription->update($updates);

        return $this->successResponse([
            'resort_id' => $resort->id,
            'resort_name' => $resort->name,
            'subscription' => $this->subscriptionPayload($subscription->refresh()),
        ], 'Subscription updated');
    }

    private function primaryResortForUser(User $user): ?Resort
    {
        if ($user->tenant_id === null) {
            return null;
        }

        return Resort::withoutGlobalScopes()
            ->where('tenant_id', $user->tenant_id)
            ->orderBy('id')
            ->first();
    }

    private function subscriptionForResort(Resort $resort): ?Subscription
    {
        return Subscription::query()
            ->where('resort_id', $resort->id)
            ->first()
            ?? Subscription::query()
                ->where('tenant_id', $resort->tenant_id)
                ->orderByDesc('id')
                ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionPayload(Subscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'plan' => $subscription->plan,
            'status' => $subscription->status,
            'base_price' => (string) $subscription->base_price,
            'included_rooms' => (int) $subscription->included_rooms,
            'extra_room_fee' => (string) $subscription->extra_room_fee,
            'active_room_count' => (int) $subscription->active_room_count,
            'total_monthly_fee' => (string) $subscription->total_monthly_fee,
            'billing_cycle_start' => $subscription->billing_cycle_start?->toDateString(),
            'billing_cycle_end' => $subscription->billing_cycle_end?->toDateString(),
            'next_due_date' => $subscription->next_due_date?->toDateString(),
            'grace_until' => $subscription->grace_until?->toDateString(),
        ];
    }
}
