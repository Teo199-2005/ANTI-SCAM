<?php

namespace App\Services;

use App\Models\ReferralSignupAttribution;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Support\TenantPublicIdentifier;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ReferralSignupTrialService
{
    public function __construct(
        private readonly MarketingReferralCodeService $referralCodes,
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function resolveMarketer(string $code): ?User
    {
        $normalized = $this->referralCodes->normalize($code);
        if ($normalized === '') {
            return null;
        }

        return User::query()
            ->where('role', 'marketing')
            ->where('referral_code', $normalized)
            ->first();
    }

    /**
     * @return array{active: bool, ends_at: string|null, code: string|null, marketer_name: string|null}
     */
    public function trialPayloadForUser(User $user): array
    {
        if (! $this->hasActiveTrial($user)) {
            return [
                'active' => false,
                'ends_at' => null,
                'code' => null,
                'marketer_name' => null,
            ];
        }

        $marketer = $user->referred_by_marketer_id
            ? User::query()->find($user->referred_by_marketer_id)
            : null;

        return [
            'active' => true,
            'ends_at' => $user->referral_trial_ends_at?->toIso8601String(),
            'code' => $user->signup_referral_code,
            'marketer_name' => $marketer?->name,
        ];
    }

    public function hasActiveTrial(User $user): bool
    {
        return $user->referral_trial_ends_at !== null
            && $user->referral_trial_ends_at->isFuture();
    }

    /**
     * Redeem referral at registration for a resort owner.
     *
     * @return array{referral_trial: array<string, mixed>}
     */
    public function redeemAtRegistration(User $user, string $referralCode, ?string $businessName): array
    {
        if ($user->role !== 'resort_owner') {
            return ['referral_trial' => $this->trialPayloadForUser($user)];
        }

        $marketer = $this->resolveMarketer($referralCode);
        if (! $marketer) {
            throw ValidationException::withMessages([
                'referral_code' => ['Invalid or expired referral code.'],
            ]);
        }

        $normalized = $this->referralCodes->normalize($referralCode);
        $trialStarts = now();
        $trialEnds = $trialStarts->copy()->addMonth();

        DB::transaction(function () use ($user, $marketer, $normalized, $trialStarts, $trialEnds, $businessName): void {
            $user->forceFill([
                'referred_by_marketer_id' => $marketer->id,
                'signup_referral_code' => $normalized,
                'referral_trial_ends_at' => $trialEnds,
                'referral_trial_redeemed_at' => $trialStarts,
            ])->save();

            ReferralSignupAttribution::query()->create([
                'marketer_id' => $marketer->id,
                'referred_user_id' => $user->id,
                'tenant_id' => null,
                'referral_code' => $normalized,
                'trial_starts_at' => $trialStarts,
                'trial_ends_at' => $trialEnds,
            ]);

            $business = trim((string) $businessName);
            if ($business !== '' && $user->tenant_id === null) {
                $this->provisionMinimalWorkspace($user, $business, $marketer, $trialEnds);
            }
        });

        $user->refresh();

        return ['referral_trial' => $this->trialPayloadForUser($user)];
    }

    /**
     * After owner onboard: align subscription with signup trial if still active.
     */
    public function applyTrialAfterOnboard(User $user, Resort $resort, Subscription $subscription): Subscription
    {
        if (! $this->hasActiveTrial($user)) {
            return $subscription;
        }

        $trialEnd = Carbon::parse($user->referral_trial_ends_at);
        $trialEndDate = $trialEnd->toDateString();

        $subscription->update([
            'status' => 'active',
            'billing_cycle_start' => now()->toDateString(),
            'billing_cycle_end' => $trialEndDate,
            'next_due_date' => $trialEndDate,
            'grace_until' => null,
        ]);

        $marketerId = (int) $user->referred_by_marketer_id;
        if ($marketerId > 0) {
            DB::table('marketer_resorts')->updateOrInsert(
                ['marketer_id' => $marketerId, 'resort_id' => $resort->id],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }

        ReferralSignupAttribution::query()
            ->where('referred_user_id', $user->id)
            ->update(['tenant_id' => $resort->tenant_id]);

        if ($user->referral_trial_redeemed_at === null) {
            $user->update(['referral_trial_redeemed_at' => now()]);
        }

        return $subscription->refresh();
    }

    public function countSignupClients(int $marketerId): int
    {
        return ReferralSignupAttribution::query()
            ->where('marketer_id', $marketerId)
            ->count();
    }

    /** After signup trial ends, mark subscription expired so owners can renew via Subscribe. */
    public function expireLapsedTrials(): int
    {
        $updated = 0;
        $today = now()->toDateString();

        User::query()
            ->where('role', 'resort_owner')
            ->whereNotNull('referral_trial_ends_at')
            ->where('referral_trial_ends_at', '<', now())
            ->whereNotNull('tenant_id')
            ->orderBy('id')
            ->chunkById(50, function ($users) use (&$updated, $today): void {
                foreach ($users as $user) {
                    $updated += Subscription::query()
                        ->where('tenant_id', $user->tenant_id)
                        ->where('status', 'active')
                        ->whereDate('next_due_date', '<=', $today)
                        ->update([
                            'status' => 'expired',
                            'grace_until' => null,
                        ]);
                }
            });

        return $updated;
    }

    private function provisionMinimalWorkspace(User $user, string $businessName, User $marketer, Carbon $trialEnds): void
    {
        $base = TenantPublicIdentifier::preferredSubdomainBaseFromResortName($businessName, $businessName);
        $publicKey = TenantPublicIdentifier::allocateUniqueSubdomain($base);

        $tenant = Tenant::create([
            'name' => $businessName,
            'slug' => $publicKey,
            'subdomain' => $publicKey,
            'status' => 'active',
        ]);

        $user->update(['tenant_id' => $tenant->id]);

        $resortPayload = [
            'tenant_id' => $tenant->id,
            'name' => $businessName,
            'description' => null,
            'is_publicly_listed' => false,
        ];

        if (Schema::hasColumn('resorts', 'logo_url')) {
            $resortPayload['logo_url'] = null;
        }

        $resort = Resort::withoutGlobalScopes()->create($resortPayload);

        $subscription = $this->subscriptions->refreshForResort($resort, 'basic');
        $trialEndDate = $trialEnds->toDateString();

        $subscription->update([
            'status' => 'active',
            'billing_cycle_start' => now()->toDateString(),
            'billing_cycle_end' => $trialEndDate,
            'next_due_date' => $trialEndDate,
        ]);

        DB::table('marketer_resorts')->updateOrInsert(
            ['marketer_id' => $marketer->id, 'resort_id' => $resort->id],
            ['created_at' => now(), 'updated_at' => now()]
        );

        ReferralSignupAttribution::query()
            ->where('referred_user_id', $user->id)
            ->update(['tenant_id' => $tenant->id]);
    }
}
