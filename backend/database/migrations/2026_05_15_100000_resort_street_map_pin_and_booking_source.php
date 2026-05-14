<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'address_street_line')) {
                $table->string('address_street_line', 255)->nullable()->after('address_barangay_name');
            }
            if (! Schema::hasColumn('resorts', 'map_latitude')) {
                $table->decimal('map_latitude', 10, 7)->nullable()->after('address_street_line');
            }
            if (! Schema::hasColumn('resorts', 'map_longitude')) {
                $table->decimal('map_longitude', 10, 7)->nullable()->after('map_latitude');
            }
        });

        Schema::table('reservations', function (Blueprint $table): void {
            if (! Schema::hasColumn('reservations', 'booking_source')) {
                $table->string('booking_source', 20)->default('online')->after('client_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            if (Schema::hasColumn('reservations', 'booking_source')) {
                $table->dropColumn('booking_source');
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            foreach (['map_longitude', 'map_latitude', 'address_street_line'] as $col) {
                if (Schema::hasColumn('resorts', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
