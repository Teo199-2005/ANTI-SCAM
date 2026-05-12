<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'address_province_psgc')) {
                $table->string('address_province_psgc', 12)->nullable()->after('address');
            }
            if (! Schema::hasColumn('resorts', 'address_city_municipality_psgc')) {
                $table->string('address_city_municipality_psgc', 12)->nullable()->after('address_province_psgc');
            }
            if (! Schema::hasColumn('resorts', 'address_barangay_psgc')) {
                $table->string('address_barangay_psgc', 12)->nullable()->after('address_city_municipality_psgc');
            }
            if (! Schema::hasColumn('resorts', 'address_label')) {
                $table->string('address_label', 512)->nullable()->after('address_barangay_psgc');
            }
        });

        if (Schema::hasColumn('resorts', 'address')) {
            DB::table('resorts')->whereNotNull('address')->where('address', '!=', '')->update([
                'address_label' => DB::raw('address'),
            ]);
        }

        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'address')) {
                $table->dropColumn('address');
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            $table->index(['address_province_psgc', 'address_city_municipality_psgc'], 'resorts_psgc_province_city_index');
        });

        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'mailing_province_psgc')) {
                $table->string('mailing_province_psgc', 12)->nullable()->after('marketer_gov_id_document_url');
            }
            if (! Schema::hasColumn('users', 'mailing_city_municipality_psgc')) {
                $table->string('mailing_city_municipality_psgc', 12)->nullable()->after('mailing_province_psgc');
            }
            if (! Schema::hasColumn('users', 'mailing_barangay_psgc')) {
                $table->string('mailing_barangay_psgc', 12)->nullable()->after('mailing_city_municipality_psgc');
            }
            if (! Schema::hasColumn('users', 'mailing_location_label')) {
                $table->string('mailing_location_label', 512)->nullable()->after('mailing_barangay_psgc');
            }
        });

        if (Schema::hasColumn('users', 'marketer_mailing_address')) {
            DB::table('users')->whereNotNull('marketer_mailing_address')->where('marketer_mailing_address', '!=', '')->update([
                'mailing_location_label' => DB::raw('marketer_mailing_address'),
            ]);
        }

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'marketer_mailing_address')) {
                $table->dropColumn('marketer_mailing_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'marketer_mailing_address')) {
                $table->text('marketer_mailing_address')->nullable()->after('marketer_gov_id_document_url');
            }
        });

        if (Schema::hasColumn('users', 'mailing_location_label')) {
            DB::table('users')->whereNotNull('mailing_location_label')->update([
                'marketer_mailing_address' => DB::raw('mailing_location_label'),
            ]);
        }

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'mailing_location_label')) {
                $table->dropColumn([
                    'mailing_province_psgc',
                    'mailing_city_municipality_psgc',
                    'mailing_barangay_psgc',
                    'mailing_location_label',
                ]);
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'address')) {
                $table->string('address')->nullable()->after('description');
            }
        });

        if (Schema::hasColumn('resorts', 'address_label')) {
            DB::table('resorts')->whereNotNull('address_label')->update([
                'address' => DB::raw('address_label'),
            ]);
        }

        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'address_province_psgc')) {
                $table->dropIndex('resorts_psgc_province_city_index');
                $table->dropColumn([
                    'address_province_psgc',
                    'address_city_municipality_psgc',
                    'address_barangay_psgc',
                    'address_label',
                ]);
            }
        });
    }
};
