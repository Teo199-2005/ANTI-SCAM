<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'address_barangay_name')) {
                $table->string('address_barangay_name', 180)->nullable()->after('address_barangay_psgc');
            }
        });

        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'mailing_barangay_name')) {
                $table->string('mailing_barangay_name', 180)->nullable()->after('mailing_barangay_psgc');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'mailing_barangay_name')) {
                $table->dropColumn('mailing_barangay_name');
            }
        });

        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'address_barangay_name')) {
                $table->dropColumn('address_barangay_name');
            }
        });
    }
};
