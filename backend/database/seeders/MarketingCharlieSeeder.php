<?php

namespace Database\Seeders;

use App\Models\Resort;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MarketingCharlieSeeder extends Seeder
{
    public function run(): void
    {
        $charlie = User::query()->updateOrCreate(
            ['email' => 'charlie.santiago@resort.test'],
            [
                'tenant_id' => null,
                'name' => 'Charlie Santiago',
                'password' => 'password',
                'role' => 'marketing',
                'referral_code' => 'CHARLIE01',
                'email_verified_at' => now(),
            ],
        );

        if (! Schema::hasTable('marketer_resorts')) {
            return;
        }

        $resortIds = Resort::query()->orderBy('id')->limit(4)->pluck('id');
        foreach ($resortIds as $resortId) {
            DB::table('marketer_resorts')->updateOrInsert(
                [
                    'marketer_id' => $charlie->id,
                    'resort_id' => $resortId,
                ],
                [
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}
