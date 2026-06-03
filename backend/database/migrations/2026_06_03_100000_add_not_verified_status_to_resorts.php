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
            // Change verification_status default to 'not_verified' for new resorts
            // that have never submitted verification documents.
            $table->string('verification_status', 50)->default('not_verified')->change();
        });

        // Update existing resorts with 'pending' status and no verification_submitted_at
        // to the new 'not_verified' status.
        DB::table('resorts')
            ->where('verification_status', 'pending')
            ->whereNull('verification_submitted_at')
            ->update(['verification_status' => 'not_verified']);
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            $table->string('verification_status', 50)->default('pending')->change();
        });

        DB::table('resorts')
            ->where('verification_status', 'not_verified')
            ->update(['verification_status' => 'pending']);
    }
};
