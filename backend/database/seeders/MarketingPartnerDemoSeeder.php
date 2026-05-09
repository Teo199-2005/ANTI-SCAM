<?php

namespace Database\Seeders;

use App\Models\Resort;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent demo marketer for quick login (marketer@resort.test).
 * Safe to run anytime — does not require re-running FullDashboardDemoSeeder.
 */
class MarketingPartnerDemoSeeder extends Seeder
{
    public function run(): void
    {
        $marketer = User::query()->updateOrCreate(
            ['email' => 'marketer@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Ana Rodriguez',
                'password' => Hash::make('password'),
                'role' => 'marketing',
                'referral_code' => 'RODRIGUEZ8391',
                'email_verified_at' => now(),
            ]
        );

        if (! Schema::hasTable('marketer_resorts')) {
            return;
        }

        $resortIds = Resort::query()->orderBy('id')->limit(4)->pluck('id');
        foreach ($resortIds as $rid) {
            DB::table('marketer_resorts')->updateOrInsert(
                ['marketer_id' => $marketer->id, 'resort_id' => $rid],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }
}
