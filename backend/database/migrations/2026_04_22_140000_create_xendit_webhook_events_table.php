<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('xendit_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('event_type')->nullable();
            $table->string('invoice_id')->nullable()->index();
            $table->timestamp('processed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('xendit_webhook_events');
    }
};
