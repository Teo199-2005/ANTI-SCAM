<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('home_resort_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('resorts')
                ->nullOnDelete();
        });

        Schema::create('guest_favorite_rooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'room_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_favorite_rooms');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('home_resort_id');
        });
    }
};
