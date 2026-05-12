<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('psgc_provinces')) {
            Schema::create('psgc_provinces', function (Blueprint $table): void {
                $table->string('code', 12)->primary();
                $table->string('name', 120);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('psgc_cities_municipalities')) {
            Schema::create('psgc_cities_municipalities', function (Blueprint $table): void {
                $table->string('code', 12)->primary();
                $table->string('province_code', 12)->index();
                $table->string('name', 160);
                $table->timestamps();

                $table->foreign('province_code')->references('code')->on('psgc_provinces')->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('psgc_barangays')) {
            Schema::create('psgc_barangays', function (Blueprint $table): void {
                $table->string('code', 12)->primary();
                $table->string('city_municipality_code', 12)->index();
                $table->string('name', 180);
                $table->timestamps();

                $table->foreign('city_municipality_code')->references('code')->on('psgc_cities_municipalities')->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('psgc_barangays');
        Schema::dropIfExists('psgc_cities_municipalities');
        Schema::dropIfExists('psgc_provinces');
    }
};
