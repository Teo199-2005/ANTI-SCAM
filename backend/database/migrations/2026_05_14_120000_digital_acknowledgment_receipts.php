<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_receipt_sequences', function (Blueprint $table): void {
            $table->id();
            $table->string('kind', 8);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_sequence')->default(0);
            $table->timestamps();

            $table->unique(['kind', 'year']);
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->string('acknowledgment_receipt_no', 32)->nullable()->after('reference_no')->unique();
        });

        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->string('acknowledgment_receipt_no', 32)->nullable()->after('plan')->unique();
        });
    }

    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->dropUnique(['acknowledgment_receipt_no']);
            $table->dropColumn('acknowledgment_receipt_no');
        });

        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropUnique(['acknowledgment_receipt_no']);
            $table->dropColumn('acknowledgment_receipt_no');
        });

        Schema::dropIfExists('digital_receipt_sequences');
    }
};
