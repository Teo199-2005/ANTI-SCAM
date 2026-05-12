<?php

namespace App\Support;

use App\Models\User;
use App\Services\PhilippineLocationService;

final class UserProfilePresenter
{
    /** @return array<string, mixed> */
    public static function toArray(User $user): array
    {
        $a = $user->toArray();
        if ($user->role === 'marketing') {
            $a['gcash_masked_number'] = $user->gcashAccountNumberMasked();
            $a['gcash_account_holder_name'] = $user->gcash_account_holder_name;
            $a['gcash_payout_configured'] = filled($user->gcash_account_number) && filled($user->gcash_account_holder_name);

            $govMeta = $user->marketer_gov_id_type
                ? MarketingGovIdCatalog::find((string) $user->marketer_gov_id_type)
                : null;
            $a['marketer_gov_id_type'] = $user->marketer_gov_id_type;
            $a['marketer_gov_id_has_number'] = filled($user->marketer_gov_id_number);
            $a['marketer_gov_id_number_masked'] = $user->marketerGovIdNumberMasked();
            $a['marketer_gov_id_document_url'] = $user->marketer_gov_id_document_url;
            $a['marketer_gov_id_placeholder'] = $govMeta['placeholder'] ?? null;
            $a['marketer_gov_id_format_hint'] = $govMeta['format_hint'] ?? null;
            $a['marketer_gov_id_label'] = $govMeta['label'] ?? null;
            $a['marketer_gov_id_complete'] = filled($user->marketer_gov_id_type)
                && filled($user->marketer_gov_id_number)
                && filled($user->marketer_gov_id_document_url);

            $loc = app(PhilippineLocationService::class);
            $a['mailing_province_psgc'] = $user->mailing_province_psgc;
            $a['mailing_city_municipality_psgc'] = $user->mailing_city_municipality_psgc;
            $a['mailing_barangay_psgc'] = $user->mailing_barangay_psgc;
            $a['mailing_location_label'] = $user->mailing_location_label;
            $a['marketer_mailing_address'] = $loc->userMailingDisplayLine($user);
            $a['marketer_tin_masked'] = $user->marketerTinMasked();
            $a['marketer_bank_name'] = $user->marketer_bank_name;
            $a['marketer_bank_branch'] = $user->marketer_bank_branch;
            $a['marketer_bank_account_name'] = $user->marketer_bank_account_name;
            $a['marketer_bank_account_masked'] = $user->marketerBankAccountMasked();
            $a['marketer_bank_details_complete'] = filled($user->marketer_bank_name)
                && filled($user->marketer_bank_account_name)
                && filled($user->marketer_bank_account_number);
        }

        return $a;
    }
}
