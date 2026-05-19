<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('system_settings')) {
            return;
        }

        $now = now();

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'marketing_booking_commission_php'],
            [
                'value' => '10.00',
                'type' => 'decimal',
                'description' => 'Flat PHP credited per qualifying paid online guest booking (assigned resorts). Applies only to NEW credits; past events and disbursements are unchanged.',
                'updated_at' => $now,
                'created_at' => $now,
            ],
        );

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'marketing_booking_commission_enabled'],
            [
                'value' => 'true',
                'type' => 'boolean',
                'description' => 'When disabled, no new booking commission credits are created (reversals still run for existing credits).',
                'updated_at' => $now,
                'created_at' => $now,
            ],
        );

        if (DB::table('system_settings')->where('key', 'commission_rate')->exists()) {
            DB::table('system_settings')
                ->where('key', 'commission_rate')
                ->update([
                    'description' => 'Deprecated: legacy subscription commission rate. Booking commissions use marketing_booking_commission_php.',
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('system_settings')) {
            return;
        }

        DB::table('system_settings')->whereIn('key', [
            'marketing_booking_commission_php',
            'marketing_booking_commission_enabled',
        ])->delete();
    }
};
