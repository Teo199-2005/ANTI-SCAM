<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'referred_by_marketer_id')) {
                $table->foreignId('referred_by_marketer_id')->nullable()->after('referral_code')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'signup_referral_code')) {
                $table->string('signup_referral_code', 32)->nullable()->after('referred_by_marketer_id');
            }
            if (! Schema::hasColumn('users', 'referral_trial_ends_at')) {
                $table->timestamp('referral_trial_ends_at')->nullable()->after('signup_referral_code');
            }
            if (! Schema::hasColumn('users', 'referral_trial_redeemed_at')) {
                $table->timestamp('referral_trial_redeemed_at')->nullable()->after('referral_trial_ends_at');
            }
        });

        if (! Schema::hasTable('referral_signup_attributions')) {
            Schema::create('referral_signup_attributions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('marketer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('referred_user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
                $table->string('referral_code', 32);
                $table->timestamp('trial_starts_at');
                $table->timestamp('trial_ends_at');
                $table->timestamps();

                $table->index(['marketer_id', 'trial_ends_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_signup_attributions');

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'referred_by_marketer_id')) {
                $table->dropConstrainedForeignId('referred_by_marketer_id');
            }
            foreach (['signup_referral_code', 'referral_trial_ends_at', 'referral_trial_redeemed_at'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
