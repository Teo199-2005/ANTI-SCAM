<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            $table->decimal('gross_commissions_total', 12, 2)->nullable()->after('total_amount');
            $table->decimal('withholding_rate_applied', 6, 4)->nullable()->after('gross_commissions_total');
        });
    }

    public function down(): void
    {
        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            $table->dropColumn(['gross_commissions_total', 'withholding_rate_applied']);
        });
    }
};
