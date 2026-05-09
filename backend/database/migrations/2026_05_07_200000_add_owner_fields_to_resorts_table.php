<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table) {
            $table->string('background_image_url', 2048)->nullable()->after('logo_url');
            $table->string('representative_name', 190)->nullable()->after('background_image_url');
            $table->string('representative_contact_number', 30)->nullable()->after('representative_name');
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table) {
            $table->dropColumn([
                'background_image_url',
                'representative_name',
                'representative_contact_number',
            ]);
        });
    }
};
