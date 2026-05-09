<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->string('xendit_invoice_id')->nullable()->unique();
            $table->string('xendit_invoice_url')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('plan');
            $table->enum('status', ['pending', 'paid', 'failed', 'expired'])->default('pending');
            $table->date('billing_cycle_start');
            $table->date('billing_cycle_end');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'subscription_id', 'status']);
            $table->index(['tenant_id', 'resort_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_invoices');
    }
};

