<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            if (! Schema::hasColumn('reservations', 'booking_lock_id')) {
                $table->foreignId('booking_lock_id')->nullable()->after('room_id')->constrained('booking_locks')->nullOnDelete();
                $table->unique('booking_lock_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            if (Schema::hasColumn('reservations', 'booking_lock_id')) {
                $table->dropUnique(['booking_lock_id']);
                $table->dropConstrainedForeignId('booking_lock_id');
            }
        });
    }
};
