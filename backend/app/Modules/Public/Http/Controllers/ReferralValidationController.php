<?php

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Models\User;
use App\Services\LandingReadinessService;
use App\Services\MarketingReferralCodeService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ReferralValidationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly MarketingReferralCodeService $referrals,
        private readonly LandingReadinessService $readiness,
    ) {}

    /** Validate a marketer referral code (optional resort scope for assignment checks). */
    public function validateCode(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
            'resort_id' => ['nullable', 'integer', 'exists:resorts,id'],
        ]);

        $normalized = $this->referrals->normalize($data['code']);
        $marketer = User::query()
            ->where('role', 'marketing')
            ->where('referral_code', $normalized)
            ->first();

        if (! $marketer) {
            return $this->successResponse([
                'valid' => false,
                'message' => 'Invalid or expired referral code.',
            ], 'Referral check');
        }

        $resortId = isset($data['resort_id']) ? (int) $data['resort_id'] : null;
        $readinessPayload = null;

        if ($resortId !== null) {
            // For UX: treat referral code verification as marketer-wide.
            // The resort/profile readiness gate remains enforced for applying first-month-free.
            $resort = Resort::withoutGlobalScopes()->find($resortId);
            if ($resort) {
                $readinessPayload = $this->readiness->check($resort);
            }
        }

        return $this->successResponse([
            'valid' => true,
            'code' => $normalized,
            'marketer_name' => $marketer->name,
            'readiness' => $readinessPayload,
        ], 'Referral valid');
    }

    /**
     * POST /resort-owner/referrals/validate (auth: resort_owner)
     * Same response shape as {@see validateCode}, but resolves the owner’s resort from `tenant_id`
     * so the dashboard does not chain a landing-page request before validation (fewer failures / races).
     */
    public function validateForOwner(Request $request)
    {
        $user = $request->user();
        if (! $user || $user->tenant_id === null) {
            return $this->errorResponse('No resort is linked to this account yet.', null, 422);
        }

        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
        ]);

        $normalized = $this->referrals->normalize($data['code']);
        $marketer = User::query()
            ->where('role', 'marketing')
            ->where('referral_code', $normalized)
            ->first();

        if (! $marketer) {
            return $this->successResponse([
                'valid' => false,
                'message' => 'Invalid or expired referral code.',
            ], 'Referral check');
        }

        $resort = Resort::withoutGlobalScopes()
            ->where('tenant_id', $user->tenant_id)
            ->first();

        $readinessPayload = $resort ? $this->readiness->check($resort) : null;

        return $this->successResponse([
            'valid' => true,
            'code' => $normalized,
            'marketer_name' => $marketer->name,
            'readiness' => $readinessPayload,
        ], 'Referral valid');
    }
}
