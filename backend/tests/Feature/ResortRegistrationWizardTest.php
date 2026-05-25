<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Resort;
use App\Models\ResortRegistrationDraft;
use App\Models\Room;
use App\Models\User;
use Database\Seeders\PsgcReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class ResortRegistrationWizardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PsgcReferenceSeeder::class);
    }

    /**
     * @return array<string, mixed>
     */
    private function completeDraftPayload(): array
    {
        return [
            'step1' => [
                'name' => 'Maria Santos',
                'email' => 'owner-finish@example.com',
                'contact_number' => '09171234567',
                'birth_date' => '1990-01-15',
                'owner_mailing_street_line' => '123 Owner St',
                'accept_information_certification' => true,
            ],
            'step2' => [
                'no_registered_business' => false,
                'business_name' => 'Sunset Cove OPC',
                'business_address' => '123 Beach Rd',
                'business_contact_number' => '09179876543',
                'business_status' => 'registered',
            ],
            'step3' => [
                'property_name' => 'Sunset Cove Resort',
                'hospitality_type' => 'resort',
                'planned_room_count' => 2,
                'address_province_psgc' => PsgcReferenceSeeder::DEMO_PROVINCE_CODE,
                'address_city_municipality_psgc' => PsgcReferenceSeeder::DEMO_CITY_CODE,
                'address_barangay_name' => 'Demo Barangay',
                'address_street_line' => '123 Beach',
            ],
            'step4' => [
                'logo_url' => 'https://example.test/storage/registration-drafts/1/logo.png',
                'amenities' => ['general' => ['wifi']],
                'parking_enabled' => false,
                'rooms' => [
                    [
                        'name' => 'Deluxe Room',
                        'capacity' => 4,
                        'check_in_time' => '14:00',
                        'check_out_time' => '12:00',
                        'photo_urls' => [
                            '/storage/registration-drafts/1/p1.jpg',
                            '/storage/registration-drafts/1/p2.jpg',
                            '/storage/registration-drafts/1/p3.jpg',
                            '/storage/registration-drafts/1/p4.jpg',
                            '/storage/registration-drafts/1/p5.jpg',
                        ],
                    ],
                ],
            ],
            'step5' => [
                'rooms' => [
                    [
                        'name' => 'Deluxe Room',
                        'weekday_price' => 2500,
                        'weekend_price' => 3200,
                    ],
                ],
            ],
        ];
    }

    public function test_resort_owner_register_does_not_create_tenant_until_finish(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner New',
            'email' => 'wizard-owner@example.com',
            'phone' => '09171234567',
            'password' => 'SecurePass1',
            'password_confirmation' => 'SecurePass1',
            'role_intent' => 'resort_owner',
            'accept_terms' => true,
        ]);

        $response->assertCreated();
        $user = User::query()->where('email', 'wizard-owner@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->tenant_id);
        $this->assertNull($user->registration_completed_at);
        $this->assertDatabaseHas('resort_registration_drafts', ['user_id' => $user->id]);
    }

    public function test_step_one_saves_owner_fields(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'password' => Hash::make('password'),
        ]);
        ResortRegistrationDraft::create(['user_id' => $user->id, 'current_step' => 1, 'payload' => []]);

        $response = $this->actingAs($user)->patchJson('/api/v1/resort-owner/registration/step/1', [
            'name' => 'Maria Santos',
            'email' => $user->email,
            'contact_number' => '09179876543',
            'birth_date' => '1990-01-15',
            'personal_tin' => '123-456-789-000',
            'owner_mailing_street_line' => '123 Main St',
            'accept_information_certification' => true,
        ]);

        $response->assertOk()->assertJsonPath('data.draft.payload.step1.name', 'Maria Santos');
        $user->refresh();
        $this->assertSame('Maria Santos', $user->name);
        $this->assertNotNull($user->information_certified_at);
    }

    public function test_registration_state_for_incomplete_owner(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'registration_completed_at' => null,
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/resort-owner/registration');

        $response->assertOk()
            ->assertJsonPath('data.registration_status', 'incomplete');
    }

    public function test_step_two_saves_business_draft(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => now(),
        ]);
        ResortRegistrationDraft::create(['user_id' => $user->id, 'current_step' => 2, 'payload' => []]);

        $response = $this->actingAs($user)->patchJson('/api/v1/resort-owner/registration/step/2', [
            'no_registered_business' => false,
            'business_name' => 'Sunset Cove OPC',
            'business_address' => '123 Beach Rd, Batangas',
            'business_contact_number' => '09171234567',
        ]);

        $response->assertOk()->assertJsonPath('data.draft.payload.step2.business_name', 'Sunset Cove OPC');
    }

    public function test_step_two_draft_save_allows_partial_registered_business_fields(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => now(),
        ]);
        ResortRegistrationDraft::create(['user_id' => $user->id, 'current_step' => 2, 'payload' => []]);

        $response = $this->actingAs($user)->patchJson('/api/v1/resort-owner/registration/step/2?draft=1', [
            'no_registered_business' => false,
            'business_name' => 'Partial Name Only',
        ]);

        $response->assertOk()->assertJsonPath('data.draft.payload.step2.business_name', 'Partial Name Only');
    }

    public function test_step_two_requires_business_address_on_full_save(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => now(),
        ]);
        ResortRegistrationDraft::create(['user_id' => $user->id, 'current_step' => 2, 'payload' => []]);

        $response = $this->actingAs($user)->patchJson('/api/v1/resort-owner/registration/step/2', [
            'no_registered_business' => false,
            'business_name' => 'Sunset Cove OPC',
            'business_contact_number' => '09171234567',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['business_address']);
    }

    public function test_finish_registration_creates_tenant_resort_rooms_and_marks_complete(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'email' => 'owner-finish@example.com',
            'terms_accepted_at' => now(),
            'information_certified_at' => now(),
        ]);

        ResortRegistrationDraft::create([
            'user_id' => $user->id,
            'current_step' => 6,
            'payload' => $this->completeDraftPayload(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/resort-owner/registration/finish');

        $response->assertOk()->assertJsonPath('data.registration_status', 'complete');

        $user->refresh();
        $this->assertNotNull($user->tenant_id);
        $this->assertNotNull($user->registration_completed_at);

        $resort = Resort::withoutGlobalScopes()->where('tenant_id', $user->tenant_id)->first();
        $this->assertNotNull($resort);
        $this->assertSame('Sunset Cove Resort', $resort->name);
        $this->assertFalse($resort->is_publicly_listed);
        $this->assertSame('pending', $resort->verification_status);

        $this->assertDatabaseHas('resort_business_profiles', [
            'resort_id' => $resort->id,
            'business_name' => 'Sunset Cove OPC',
        ]);

        $room = Room::withoutGlobalScopes()->where('resort_id', $resort->id)->first();
        $this->assertNotNull($room);
        $this->assertSame('Deluxe Room', $room->name);
        $this->assertEquals(2500.0, (float) $room->weekday_price);
        $this->assertEquals(3200.0, (float) $room->weekend_price);
        $this->assertGreaterThanOrEqual(5, $room->images()->count());
    }

    public function test_finish_rejects_incomplete_draft(): void
    {
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => null,
            'terms_accepted_at' => now(),
        ]);

        ResortRegistrationDraft::create([
            'user_id' => $user->id,
            'current_step' => 3,
            'payload' => [
                'step1' => $this->completeDraftPayload()['step1'],
                'step2' => $this->completeDraftPayload()['step2'],
            ],
        ]);

        $response = $this->actingAs($user)->postJson('/api/v1/resort-owner/registration/finish');

        $response->assertStatus(422);
        $this->assertNull($user->fresh()->tenant_id);
    }

    public function test_step_six_requires_all_verification_documents(): void
    {
        $tenant = \App\Models\Tenant::create([
            'name' => 'Verify Tenant',
            'slug' => 'verify-tenant',
            'subdomain' => 'verify-tenant',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'role' => 'resort_owner',
            'tenant_id' => $tenant->id,
            'registration_completed_at' => now(),
            'terms_accepted_at' => now(),
        ]);

        $resort = Resort::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Verify Resort',
            'verification_status' => 'pending',
        ]);

        $response = $this->actingAs($user)->patchJson('/api/v1/resort-owner/registration/step/6', [
            'verification_method' => 'video',
            'stable_internet_acknowledged' => true,
        ]);

        $response->assertStatus(422);
        $this->assertNull($resort->fresh()->verification_submitted_at);
    }
}
