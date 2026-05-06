<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add guest contact fields to reservations.
 * These are stored at booking time so records remain intact even if the
 * client user account is later deleted or changed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            if (! Schema::hasColumn('reservations', 'guest_name')) {
                $table->string('guest_name')->nullable()->after('client_id');
            }
            if (! Schema::hasColumn('reservations', 'guest_email')) {
                $table->string('guest_email')->nullable()->after('guest_name');
            }
            if (! Schema::hasColumn('reservations', 'guest_phone')) {
                $table->string('guest_phone', 30)->nullable()->after('guest_email');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropColumn(['guest_name', 'guest_email', 'guest_phone']);
        });
    }
};
