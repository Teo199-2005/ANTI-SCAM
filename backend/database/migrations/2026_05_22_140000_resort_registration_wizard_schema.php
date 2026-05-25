<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('users', 'personal_tin')) {
                $table->text('personal_tin')->nullable()->after('birth_date');
            }
            if (! Schema::hasColumn('users', 'owner_mailing_province_psgc')) {
                $table->string('owner_mailing_province_psgc', 20)->nullable()->after('personal_tin');
                $table->string('owner_mailing_city_municipality_psgc', 20)->nullable();
                $table->string('owner_mailing_barangay_psgc', 20)->nullable();
                $table->string('owner_mailing_barangay_name', 120)->nullable();
                $table->string('owner_mailing_street_line', 255)->nullable();
                $table->string('owner_mailing_location_label', 500)->nullable();
            }
            if (! Schema::hasColumn('users', 'information_certified_at')) {
                $table->timestamp('information_certified_at')->nullable();
            }
            if (! Schema::hasColumn('users', 'registration_completed_at')) {
                $table->timestamp('registration_completed_at')->nullable();
            }
            if (! Schema::hasColumn('users', 'onboarding_step')) {
                $table->unsignedTinyInteger('onboarding_step')->default(1);
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'hospitality_type')) {
                $table->string('hospitality_type', 64)->nullable()->after('name');
            }
            if (! Schema::hasColumn('resorts', 'hospitality_type_other')) {
                $table->string('hospitality_type_other', 120)->nullable()->after('hospitality_type');
            }
            if (! Schema::hasColumn('resorts', 'website_url')) {
                $table->string('website_url', 500)->nullable()->after('tiktok_url');
            }
            if (! Schema::hasColumn('resorts', 'planned_room_count')) {
                $table->unsignedSmallInteger('planned_room_count')->nullable();
            }
            if (! Schema::hasColumn('resorts', 'verification_method')) {
                $table->string('verification_method', 32)->nullable()->after('verification_status');
            }
            if (! Schema::hasColumn('resorts', 'verification_submitted_at')) {
                $table->timestamp('verification_submitted_at')->nullable();
            }
            if (! Schema::hasColumn('resorts', 'verified_at')) {
                $table->timestamp('verified_at')->nullable();
            }
        });

        Schema::table('rooms', function (Blueprint $table): void {
            if (! Schema::hasColumn('rooms', 'check_in_time')) {
                $table->time('check_in_time')->nullable()->after('base_price');
            }
            if (! Schema::hasColumn('rooms', 'check_out_time')) {
                $table->time('check_out_time')->nullable()->after('check_in_time');
            }
            if (! Schema::hasColumn('rooms', 'weekday_price')) {
                $table->decimal('weekday_price', 12, 2)->nullable()->after('base_price');
            }
            if (! Schema::hasColumn('rooms', 'weekend_price')) {
                $table->decimal('weekend_price', 12, 2)->nullable()->after('weekday_price');
            }
        });

        if (! Schema::hasTable('resort_registration_drafts')) {
            Schema::create('resort_registration_drafts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->unsignedTinyInteger('current_step')->default(1);
                $table->json('payload')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('resort_business_profiles')) {
            Schema::create('resort_business_profiles', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('resort_id')->unique()->constrained()->cascadeOnDelete();
                $table->string('business_status', 32)->default('unregistered');
                $table->string('business_name', 190)->nullable();
                $table->text('business_address')->nullable();
                $table->string('business_contact_number', 30)->nullable();
                $table->string('business_tin', 32)->nullable();
                $table->string('sec_dti_number', 64)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('resort_verification_documents')) {
            Schema::create('resort_verification_documents', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->string('document_type', 32);
                $table->string('disk', 32)->default('public');
                $table->string('path', 500);
                $table->string('original_name', 255)->nullable();
                $table->timestamp('uploaded_at')->nullable();
                $table->timestamps();

                $table->unique(['resort_id', 'document_type']);
            });
        }

        // Backfill existing resort owners who already have a workspace.
        if (Schema::hasColumn('users', 'registration_completed_at')) {
            DB::table('users')
                ->where('role', 'resort_owner')
                ->whereNotNull('tenant_id')
                ->whereNull('registration_completed_at')
                ->update([
                    'registration_completed_at' => now(),
                    'onboarding_step' => 6,
                ]);
        }

        if (Schema::hasColumn('resorts', 'verification_status')) {
            DB::table('resorts')
                ->whereIn('id', function ($q): void {
                    $q->select('resorts.id')
                        ->from('resorts')
                        ->join('tenants', 'tenants.id', '=', 'resorts.tenant_id')
                        ->join('users', 'users.tenant_id', '=', 'tenants.id')
                        ->where('users.role', 'resort_owner')
                        ->whereNotNull('users.registration_completed_at');
                })
                ->where('verification_status', 'pending')
                ->where('is_publicly_listed', true)
                ->update(['verification_status' => 'verified', 'verified_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('resort_verification_documents');
        Schema::dropIfExists('resort_business_profiles');
        Schema::dropIfExists('resort_registration_drafts');

        Schema::table('rooms', function (Blueprint $table): void {
            foreach (['weekend_price', 'weekday_price', 'check_out_time', 'check_in_time'] as $col) {
                if (Schema::hasColumn('rooms', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            foreach (['verified_at', 'verification_submitted_at', 'verification_method', 'planned_room_count', 'website_url', 'hospitality_type_other', 'hospitality_type'] as $col) {
                if (Schema::hasColumn('resorts', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('users', function (Blueprint $table): void {
            foreach (['onboarding_step', 'registration_completed_at', 'information_certified_at', 'owner_mailing_location_label', 'owner_mailing_street_line', 'owner_mailing_barangay_name', 'owner_mailing_barangay_psgc', 'owner_mailing_city_municipality_psgc', 'owner_mailing_province_psgc', 'personal_tin', 'birth_date'] as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
