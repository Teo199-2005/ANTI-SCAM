<?php

namespace App\Support;

use App\Models\User;
use App\Modules\Billing\Support\XenditMode;
use App\Services\PhilippineLocationService;

final class MarketerAdminProfilePresenter
{
    /** @return array<string, mixed> */
    public static function toArray(User $user): array
    {
        $govMeta = $user->marketer_gov_id_type
            ? MarketingGovIdCatalog::find((string) $user->marketer_gov_id_type)
            : null;

        $loc = app(PhilippineLocationService::class);

        return [
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'joined_at' => $user->created_at?->toIso8601String(),
            'mailing_province_psgc' => $user->mailing_province_psgc,
            'mailing_city_municipality_psgc' => $user->mailing_city_municipality_psgc,
            'mailing_barangay_name' => $user->mailing_barangay_name,
            'mailing_location_label' => $user->mailing_location_label,
            'marketer_mailing_address' => $loc->userMailingDisplayLine($user),
            'marketer_tin_masked' => $user->marketerTinMasked(),
            'marketer_gov_id_type' => $user->marketer_gov_id_type,
            'marketer_gov_id_label' => $govMeta['label'] ?? null,
            'marketer_gov_id_number_masked' => $user->marketerGovIdNumberMasked(),
            'marketer_gov_id_has_number' => filled($user->marketer_gov_id_number),
            'marketer_gov_id_document_url' => $user->marketer_gov_id_document_url,
            'marketer_gov_id_complete' => filled($user->marketer_gov_id_type)
                && filled($user->marketer_gov_id_number)
                && filled($user->marketer_gov_id_document_url),
            'marketer_bank_channel_code' => $user->marketer_bank_channel_code,
            'marketer_bank_label' => $user->marketer_bank_name,
            'bank_payout_configured' => $user->bankPayoutConfigured(),
            'marketer_bank_name' => $user->marketer_bank_name,
            'marketer_bank_branch' => $user->marketer_bank_branch,
            'marketer_bank_account_name' => $user->marketer_bank_account_name,
            'marketer_bank_account_masked' => $user->marketerBankAccountMasked(),
            'billing_xendit_mode' => XenditMode::current(),
            'marketing_payout_automation_enabled' => (bool) config('services.marketing_payout.enabled'),
        ];
    }
}
