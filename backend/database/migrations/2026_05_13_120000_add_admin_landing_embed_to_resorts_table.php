<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            $table->boolean('admin_landing_embed_enabled')->default(false)->after('is_vip');
            $table->string('admin_landing_youtube_url', 500)->nullable()->after('admin_landing_embed_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            $table->dropColumn(['admin_landing_embed_enabled', 'admin_landing_youtube_url']);
        });
    }
};
