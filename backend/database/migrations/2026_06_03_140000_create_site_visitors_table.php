<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_visitors', function (Blueprint $table) {
            $table->id();
            $table->string('session_id', 128)->index();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('page_url')->index();
            $table->string('referrer_url', 500)->nullable();
            $table->unsignedBigInteger('resort_id')->nullable()->index();
            $table->boolean('is_unique')->default(false)->index();
            $table->timestamp('visited_at')->index();

            $table->foreign('resort_id')->references('id')->on('resorts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_visitors');
    }
};
