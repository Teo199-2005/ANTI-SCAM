<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'cancellation_policy')) {
                $table->text('cancellation_policy')->nullable()->after('representative_contact_number');
            }
            if (! Schema::hasColumn('resorts', 'amenities')) {
                $table->json('amenities')->nullable()->after('cancellation_policy');
            }
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'amenities')) {
                $table->dropColumn('amenities');
            }
            if (Schema::hasColumn('resorts', 'cancellation_policy')) {
                $table->dropColumn('cancellation_policy');
            }
        });
    }
};
