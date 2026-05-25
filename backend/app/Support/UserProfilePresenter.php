<?php

namespace App\Support;

use App\Models\User;
use App\Modules\Billing\Support\XenditMode;
use App\Services\PhilippineLocationService;
use App\Services\ReferralSignupTrialService;
use App\Services\ResortRegistrationService;
use App\Support\ResortRegistrationConfig;

final class UserProfilePresenter
{
    /** @return array<string, mixed> */
    public static function toArray(User $user): array
    {
        $user->loadMissing(['homeResort.tenant:id,subdomain']);

        $a = $user->toArray();
        if ($user->homeResort) {
            $slug = (string) ($user->homeResort->tenant?->subdomain ?? '');
            $a['home_resort'] = [
                'id' => $user->homeResort->id,
                'name' => $user->homeResort->name,
                'slug' => $slug,
                'logo_url' => $user->homeResort->logo_url,
            ];
        }

        if ($user->role === 'resort_owner') {
            $a['referral_trial'] = app(ReferralSignupTrialService::class)->trialPayloadForUser($user);
            $registration = app(ResortRegistrationService::class);
            $a['registration_status'] = $registration->registrationStatus($user);
            $a['onboarding_step'] = max(1, min(6, (int) ($user->onboarding_step ?? 1)));
            $resort = \App\Models\Resort::withoutGlobalScopes()
                ->where('tenant_id', $user->tenant_id)
                ->first();
            $a['verification_status'] = $resort?->verification_status ?? 'pending';
            $a['verification_rejection_reason'] = $resort?->verification_rejection_reason;
            $a['verification_submission_count'] = (int) ($resort?->verification_submission_count ?? 0);
            $a['registration_completed_at'] = $user->registration_completed_at?->toIso8601String();
            $a['verification_submitted_at'] = $resort?->verification_submitted_at?->toIso8601String();
            $a['registration_wizard_enabled'] = ResortRegistrationConfig::wizardEnabled();
        }

        if ($user->role === 'marketing') {
            $a['marketer_bank_channel_code'] = $user->marketer_bank_channel_code;
            $a['marketer_bank_label'] = $user->marketer_bank_name;
            $a['bank_payout_configured'] = $user->bankPayoutConfigured();

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
            $a['mailing_barangay_name'] = $user->mailing_barangay_name;
            $a['mailing_location_label'] = $user->mailing_location_label;
            $a['marketer_mailing_address'] = $loc->userMailingDisplayLine($user);
            $a['marketer_tin_masked'] = $user->marketerTinMasked();
            $a['marketer_bank_name'] = $user->marketer_bank_name;
            $a['marketer_bank_branch'] = $user->marketer_bank_branch;
            $a['marketer_bank_account_name'] = $user->marketer_bank_account_name;
            $a['marketer_bank_account_masked'] = $user->marketerBankAccountMasked();
            $a['marketer_bank_details_complete'] = $user->bankPayoutConfigured();

            $a['billing_xendit_mode'] = XenditMode::current();
            $a['marketing_payout_automation_enabled'] = (bool) config('services.marketing_payout.enabled');
        }

        return $a;
    }
}
