<?php

namespace App\Services;

use App\Models\ReferralSignupAttribution;
use App\Models\Resort;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Support\SubscriptionPlan;
use App\Support\TenantPublicIdentifier;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Referral code at resort-owner signup: attribute the marketer only (no free Business Pro trial).
 */
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
        // No free referral trial — always inactive for API/UI consumers.
        $marketer = $user->referred_by_marketer_id
            ? User::query()->find($user->referred_by_marketer_id)
            : null;

        return [
            'active' => false,
            'ends_at' => null,
            'code' => $user->signup_referral_code,
            'marketer_name' => $marketer?->name,
        ];
    }

    public function hasActiveTrial(User $user): bool
    {
        return false;
    }

    /**
     * Redeem referral at registration for a resort owner (attribution only, no free plan).
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
        $attributedAt = now();

        DB::transaction(function () use ($user, $marketer, $normalized, $attributedAt, $businessName): void {
            $user->forceFill([
                'referred_by_marketer_id' => $marketer->id,
                'signup_referral_code' => $normalized,
                'referral_trial_ends_at' => null,
                'referral_trial_redeemed_at' => $attributedAt,
            ])->save();

            ReferralSignupAttribution::query()->create([
                'marketer_id' => $marketer->id,
                'referred_user_id' => $user->id,
                'tenant_id' => null,
                'referral_code' => $normalized,
                'trial_starts_at' => $attributedAt,
                'trial_ends_at' => $attributedAt,
            ]);

            $business = trim((string) $businessName);
            if ($business !== '' && $user->tenant_id === null) {
                $this->provisionMinimalWorkspace($user, $business, $marketer);
            }
        });

        $user->refresh();

        return ['referral_trial' => $this->trialPayloadForUser($user)];
    }

    /**
     * After owner onboard: link marketer to resort (no plan upgrade).
     */
    public function applyTrialAfterOnboard(User $user, Resort $resort, Subscription $subscription): Subscription
    {
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
        if (! Schema::hasTable('referral_signup_attributions')) {
            return 0;
        }

        return ReferralSignupAttribution::query()
            ->where('marketer_id', $marketerId)
            ->count();
    }

    /** Legacy: downgrade owners who still have unpaid Business Pro from old referral trials. */
    public function expireLapsedTrials(): int
    {
        $updated = 0;

        User::query()
            ->where('role', 'resort_owner')
            ->whereNotNull('referral_trial_ends_at')
            ->where('referral_trial_ends_at', '<', now())
            ->whereNotNull('tenant_id')
            ->orderBy('id')
            ->chunkById(50, function ($users) use (&$updated): void {
                foreach ($users as $user) {
                    $subscription = Subscription::query()
                        ->where('tenant_id', $user->tenant_id)
                        ->where('plan', SubscriptionPlan::BUSINESS_PRO)
                        ->first();

                    if ($subscription && ! $subscription->invoices()->where('status', 'paid')->exists()) {
                        $this->subscriptions->downgradeToStandard($subscription);
                        $updated++;
                    }
                }
            });

        return $updated;
    }

    private function provisionMinimalWorkspace(User $user, string $businessName, User $marketer): void
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

        $this->subscriptions->refreshForResort($resort, SubscriptionPlan::STANDARD, activateIfNew: true);

        DB::table('marketer_resorts')->updateOrInsert(
            ['marketer_id' => $marketer->id, 'resort_id' => $resort->id],
            ['created_at' => now(), 'updated_at' => now()]
        );

        ReferralSignupAttribution::query()
            ->where('referred_user_id', $user->id)
            ->update(['tenant_id' => $tenant->id]);
    }
}
