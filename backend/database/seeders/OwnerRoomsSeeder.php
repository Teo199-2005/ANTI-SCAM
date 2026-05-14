<?php

namespace Database\Seeders;

use App\Models\Resort;
use App\Models\Room;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PhilippineLocationService;
use Illuminate\Database\Seeder;

class OwnerRoomsSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::query()->where('email', 'owner@resort.test')->first();
        if (! $owner) {
            $this->command?->warn('owner@resort.test not found. Skipping OwnerRoomsSeeder.');
            return;
        }

        $tenantId = $owner->tenant_id;
        if (! $tenantId) {
            $tenant = Tenant::query()->create([
                'name' => 'Owner Resort Tenant',
                'slug' => 'owner-resort-tenant',
                'subdomain' => 'ownerresort',
                'status' => 'active',
            ]);
            $owner->tenant_id = $tenant->id;
            $owner->save();
            $tenantId = $tenant->id;
        }

        $resort = Resort::query()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'name' => 'Azure Sands 1',
                'description' => 'Premium beachfront stay with modern amenities.',
                'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
                'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
                'address_barangay_psgc' => PsgcReferenceSeeder::DEMO_BARANGAY_CODE,
                'address_label' => null,
                'contact_number' => '+63 917 874 4889',
                'is_publicly_listed' => true,
            ]
        );
        app(PhilippineLocationService::class)->syncResortAddressLabel($resort);
        $resort->refresh();
        if ($resort->address_label === null || trim((string) $resort->address_label) === '') {
            $resort->forceFill([
                'address_label' => 'Tagaytay City, Cavite, Philippines',
            ])->saveQuietly();
        }

        $starterRooms = [
            [
                'name' => 'Deluxe Ocean View',
                'code' => 'A101',
                'capacity' => 2,
                'base_price' => 3200,
                'amenities' => ['BED_COUNT:1', 'BED_TYPE:Queen', 'WiFi', 'Hot Shower', 'Air Conditioning', 'TV', 'Balcony', 'Toiletries'],
                'rules' => 'No smoking. Quiet hours start at 10 PM.',
                'status' => 'active',
            ],
            [
                'name' => 'Family Garden Suite',
                'code' => 'B201',
                'capacity' => 4,
                'base_price' => 4800,
                'amenities' => ['BED_COUNT:2', 'BED_TYPE:Double', 'WiFi', 'Hot Shower', 'Air Conditioning', 'TV', 'Mini Fridge', 'Breakfast Included', 'Parking'],
                'rules' => 'No parties allowed.',
                'status' => 'active',
            ],
            [
                'name' => 'Premium Jacuzzi Room',
                'code' => 'C301',
                'capacity' => 3,
                'base_price' => 5500,
                'amenities' => ['BED_COUNT:1', 'BED_TYPE:King', 'WiFi', 'Hot Shower', 'Air Conditioning', 'TV', 'Jacuzzi', 'Room Service', 'Toiletries'],
                'rules' => 'Valid ID required at check-in.',
                'status' => 'active',
            ],
            [
                'name' => 'Poolside Twin Room',
                'code' => 'D105',
                'capacity' => 2,
                'base_price' => 3600,
                'amenities' => ['BED_COUNT:2', 'BED_TYPE:Single', 'WiFi', 'Hot Shower', 'Air Conditioning', 'TV', 'Pool Access', 'Breakfast Included'],
                'rules' => 'Children must be supervised at pool area.',
                'status' => 'active',
            ],
            [
                'name' => 'Executive Balcony Suite',
                'code' => 'E401',
                'capacity' => 5,
                'base_price' => 6900,
                'amenities' => ['BED_COUNT:2', 'BED_TYPE:Mixed', 'WiFi', 'Hot Shower', 'Air Conditioning', 'TV', 'Mini Fridge', 'Balcony', 'Room Service', 'Parking'],
                'rules' => 'Maximum 5 guests only.',
                'status' => 'active',
            ],
        ];

        foreach ($starterRooms as $room) {
            Room::query()->firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'resort_id' => $resort->id,
                    'code' => $room['code'],
                ],
                [
                    'name' => $room['name'],
                    'capacity' => $room['capacity'],
                    'base_price' => $room['base_price'],
                    'amenities' => $room['amenities'],
                    'rules' => $room['rules'],
                    'status' => $room['status'],
                ]
            );
        }

        $count = Room::query()->where('tenant_id', $tenantId)->where('resort_id', $resort->id)->count();
        $this->command?->info("Owner resort now has {$count} rooms.");
    }
}

