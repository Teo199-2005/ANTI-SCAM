<?php

use App\Models\User;
use App\Services\MarketingReferralCodeService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('referral_code', 32)->nullable()->unique()->after('role');
        });

        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->string('referral_code', 32)->nullable()->after('plan');
            $table->foreignId('marketer_id')->nullable()->after('referral_code')->constrained('users')->nullOnDelete();
        });

        if (Schema::hasTable('system_settings')) {
            $exists = DB::table('system_settings')->where('key', 'referral_subscription_commission')->exists();
            if (! $exists) {
                DB::table('system_settings')->insert([
                    'key' => 'referral_subscription_commission',
                    'value' => '250',
                    'type' => 'string',
                    'description' => 'Fixed PHP commission credited to the marketer when a monthly subscription is paid using their referral code.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        User::query()->where('role', 'marketing')->whereNull('referral_code')->each(function (User $user): void {
            $svc = app(MarketingReferralCodeService::class);
            $user->forceFill(['referral_code' => $svc->generateUniqueForUser($user)])->saveQuietly();
        });
    }

    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('marketer_id');
            $table->dropColumn('referral_code');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }
};
