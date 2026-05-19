<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('commissions', 'booking_count')) {
            Schema::table('commissions', function (Blueprint $table): void {
                $table->unsignedInteger('booking_count')->default(0)->after('gross_bookings');
            });
        }

        if (! Schema::hasTable('marketer_booking_commission_events')) {
            Schema::create('marketer_booking_commission_events', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
                $table->foreignId('marketer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->foreignId('commission_id')->nullable()->constrained('commissions')->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('type', 16);
                $table->string('period', 7);
                $table->json('meta')->nullable();
                $table->timestamps();

                $table->unique(['reservation_id', 'type']);
                $table->index(['marketer_id', 'period']);
                $table->index(['resort_id', 'period']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('marketer_booking_commission_events');

        if (Schema::hasColumn('commissions', 'booking_count')) {
            Schema::table('commissions', function (Blueprint $table): void {
                $table->dropColumn('booking_count');
            });
        }
    }
};
