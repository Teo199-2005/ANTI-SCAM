<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('marketer_bank_channel_code', 32)->nullable()->after('marketer_bank_name');
        });

        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            $table->string('payout_channel_code_snapshot', 32)->nullable()->after('marketer_email_snapshot');
            $table->text('bank_account_number_snapshot')->nullable()->after('payout_channel_code_snapshot');
            $table->string('bank_account_last4_snapshot', 8)->nullable()->after('bank_account_number_snapshot');
            $table->string('bank_account_holder_name_snapshot', 120)->nullable()->after('bank_account_last4_snapshot');
            $table->string('bank_display_name_snapshot', 120)->nullable()->after('bank_account_holder_name_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            $table->dropColumn([
                'payout_channel_code_snapshot',
                'bank_account_number_snapshot',
                'bank_account_last4_snapshot',
                'bank_account_holder_name_snapshot',
                'bank_display_name_snapshot',
            ]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('marketer_bank_channel_code');
        });
    }
};
