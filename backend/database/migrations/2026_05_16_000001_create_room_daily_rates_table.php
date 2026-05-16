<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('room_daily_rates')) {
            return;
        }

        Schema::create('room_daily_rates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('nightly_price', 10, 2);
            $table->timestamps();

            $table->unique(['room_id', 'date']);
            $table->index(['tenant_id', 'room_id', 'date'], 'room_daily_rates_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_daily_rates');
    }
};
