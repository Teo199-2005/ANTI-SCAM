<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->timestamp('cancelled_at')->nullable()->after('reserved_at');
            $table->string('cancellation_reason')->nullable()->after('cancelled_at');
            $table->enum('refund_status', ['none', 'non_refundable_fee_retained', 'refunded'])
                ->default('none')
                ->after('cancellation_reason');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropColumn(['cancelled_at', 'cancellation_reason', 'refund_status']);
        });
    }
};
