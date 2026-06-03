<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resort_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('rating'); // 1-5
            $table->text('comment')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->unique('reservation_id', 'resort_reviews_reservation_unique');
            $table->index(['resort_id', 'is_visible', 'created_at'], 'resort_reviews_resort_visible_created');
            $table->index(['user_id', 'created_at'], 'resort_reviews_user_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resort_reviews');
    }
};
