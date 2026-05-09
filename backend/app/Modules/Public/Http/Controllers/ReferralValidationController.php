<?php

namespace App\Modules\Public\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MarketingReferralCodeService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReferralValidationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly MarketingReferralCodeService $referrals) {}

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
        if ($resortId !== null) {
            $assigned = DB::table('marketer_resorts')
                ->where('marketer_id', $marketer->id)
                ->where('resort_id', $resortId)
                ->exists();

            if (! $assigned) {
                return $this->successResponse([
                    'valid' => false,
                    'message' => 'This referral code is not linked to this resort. Ask your marketer for the correct code.',
                ], 'Referral check');
            }
        }

        return $this->successResponse([
            'valid' => true,
            'code' => $normalized,
            'marketer_name' => $marketer->name,
        ], 'Referral valid');
    }
}
