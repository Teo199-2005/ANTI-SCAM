<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Services\MarketingReferralCodeService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['tenant_id', 'home_resort_id', 'name', 'email', 'avatar_url', 'phone', 'google_id', 'password', 'role', 'referral_code', 'booking_commission_php', 'referred_by_marketer_id', 'signup_referral_code', 'referral_trial_ends_at', 'referral_trial_redeemed_at', 'gcash_account_number', 'gcash_account_holder_name', 'marketer_gov_id_type', 'marketer_gov_id_number', 'marketer_gov_id_document_url', 'mailing_province_psgc', 'mailing_city_municipality_psgc', 'mailing_barangay_psgc', 'mailing_barangay_name', 'mailing_location_label', 'marketer_tin', 'marketer_bank_name', 'marketer_bank_branch', 'marketer_bank_account_name', 'marketer_bank_account_number', 'email_verified_at', 'terms_accepted_at', 'terms_version'])]
#[Hidden(['password', 'remember_token', 'gcash_account_number', 'gcash_account_holder_name', 'marketer_gov_id_number', 'marketer_tin', 'marketer_bank_account_number'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected static function booted(): void
    {
        static::saved(function (User $user): void {
            if ($user->role !== 'marketing' || filled($user->referral_code)) {
                return;
            }

            $svc = app(MarketingReferralCodeService::class);
            $user->forceFill(['referral_code' => $svc->generateUniqueForUser($user)])->saveQuietly();
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'referral_trial_ends_at' => 'datetime',
            'referral_trial_redeemed_at' => 'datetime',
            'password' => 'hashed',
            'booking_commission_php' => 'decimal:2',
            'gcash_account_number' => 'encrypted',
            'marketer_gov_id_number' => 'encrypted',
            'marketer_tin' => 'encrypted',
            'marketer_bank_account_number' => 'encrypted',
        ];
    }

    public function gcashAccountNumberMasked(): ?string
    {
        $n = $this->gcash_account_number;
        if ($n === null || $n === '') {
            return null;
        }

        $len = strlen($n);
        if ($len <= 4) {
            return str_repeat('•', max(0, $len - 1)).substr($n, -1);
        }

        return str_repeat('•', $len - 4).substr($n, -4);
    }

    public function marketerGovIdNumberMasked(): ?string
    {
        $n = $this->marketer_gov_id_number;
        if ($n === null || $n === '') {
            return null;
        }

        $len = strlen($n);
        if ($len <= 3) {
            return str_repeat('•', $len);
        }

        return str_repeat('•', $len - 3).substr($n, -3);
    }

    public function marketerTinMasked(): ?string
    {
        $n = $this->marketer_tin;
        if ($n === null || $n === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $n) ?? '';
        if (strlen($digits) < 4) {
            return str_repeat('•', strlen($digits));
        }

        return str_repeat('•', strlen($digits) - 4).substr($digits, -4);
    }

    public function marketerBankAccountMasked(): ?string
    {
        $n = $this->marketer_bank_account_number;
        if ($n === null || $n === '') {
            return null;
        }

        $len = strlen($n);
        if ($len <= 4) {
            return str_repeat('•', max(0, $len - 1)).substr($n, -1);
        }

        return str_repeat('•', $len - 4).substr($n, -4);
    }

    /** Resorts assigned to this marketer. */
    public function assignedResorts(): BelongsToMany
    {
        return $this->belongsToMany(Resort::class, 'marketer_resorts', 'marketer_id', 'resort_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function homeResort(): BelongsTo
    {
        return $this->belongsTo(Resort::class, 'home_resort_id');
    }

    public function guestFavoriteRooms(): HasMany
    {
        return $this->hasMany(GuestFavoriteRoom::class);
    }
}
