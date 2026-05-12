<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table) {
            $table->string('facebook_url', 2048)->nullable()->after('background_image_url');
            $table->string('instagram_url', 2048)->nullable()->after('facebook_url');
            $table->string('tiktok_url', 2048)->nullable()->after('instagram_url');
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table) {
            $table->dropColumn(['facebook_url', 'instagram_url', 'tiktok_url']);
        });
    }
};
