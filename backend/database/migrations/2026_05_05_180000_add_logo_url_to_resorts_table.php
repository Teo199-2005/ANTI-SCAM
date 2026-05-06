<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'logo_url')) {
                $table->string('logo_url', 2048)->nullable()->after('contact_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'logo_url')) {
                $table->dropColumn('logo_url');
            }
        });
    }
};
