<?php

namespace Database\Seeders;

use App\Models\Resort;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent demo marketers for quick login (marketer@resort.test, charlie.santiago@resort.test).
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
                'password' => 'password',
                'role' => 'marketing',
                'referral_code' => 'RODRIGUEZ8391',
                'email_verified_at' => now(),
            ]
        );

        $bossMarketer = User::query()->updateOrCreate(
            ['email' => 'charlie.santiago@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Charlie Santiago',
                'password' => 'password',
                'role' => 'marketing',
                'referral_code' => 'CHARLIE01',
                'email_verified_at' => now(),
            ]
        );

        if (! Schema::hasTable('marketer_resorts')) {
            return;
        }

        $resortIds = Resort::query()->orderBy('id')->limit(4)->pluck('id');
        foreach ([$marketer, $bossMarketer] as $m) {
            foreach ($resortIds as $rid) {
                DB::table('marketer_resorts')->updateOrInsert(
                    ['marketer_id' => $m->id, 'resort_id' => $rid],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }
}
