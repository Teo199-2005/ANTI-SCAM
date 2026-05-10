<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commissions', function (Blueprint $table): void {
            $table->string('marketer_tier', 32)->nullable()->after('commission_rate');
            $table->decimal('unit_commission_php', 10, 2)->nullable()->after('marketer_tier');
        });
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table): void {
            $table->dropColumn(['marketer_tier', 'unit_commission_php']);
        });
    }
};
