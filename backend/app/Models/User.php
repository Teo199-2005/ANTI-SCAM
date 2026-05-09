<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Notifications\Notifiable;
use App\Services\MarketingReferralCodeService;

#[Fillable(['tenant_id', 'name', 'email', 'avatar_url', 'phone', 'google_id', 'password', 'role', 'referral_code', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
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
            'password' => 'hashed',
        ];
    }

    /** Resorts assigned to this marketer. */
    public function assignedResorts(): BelongsToMany
    {
        return $this->belongsToMany(Resort::class, 'marketer_resorts', 'marketer_id', 'resort_id');
    }
}
