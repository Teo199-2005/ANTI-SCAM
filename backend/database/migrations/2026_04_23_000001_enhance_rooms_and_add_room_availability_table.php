<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE rooms MODIFY status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active'");
        }

        Schema::table('rooms', function (Blueprint $table): void {
            $table->json('amenities')->nullable()->after('base_price');
            $table->text('rules')->nullable()->after('amenities');
        });

        Schema::create('room_availability', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['available', 'blocked', 'maintenance'])->default('blocked');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'room_id', 'start_date', 'end_date'], 'room_availability_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_availability');

        Schema::table('rooms', function (Blueprint $table): void {
            $table->dropColumn(['amenities', 'rules']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE rooms MODIFY status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
        }
    }
};
