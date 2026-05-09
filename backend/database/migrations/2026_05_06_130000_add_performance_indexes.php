<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->index(['tenant_id', 'status', 'created_at'], 'reservations_tenant_status_created_idx');
            $table->index(['client_id', 'status', 'created_at'], 'reservations_client_status_created_idx');
            $table->index(['tenant_id', 'created_at'], 'reservations_tenant_created_idx');
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->index(['status', 'next_due_date'], 'subscriptions_status_next_due_idx');
        });

        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->index(
                ['subscription_id', 'status', 'billing_cycle_start', 'billing_cycle_end'],
                'sub_invoices_sub_status_cycle_idx'
            );
        });

        Schema::table('discount_codes', function (Blueprint $table): void {
            $table->index(['resort_id', 'code'], 'discount_codes_resort_code_idx');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table): void {
            $table->dropIndex('reservations_tenant_status_created_idx');
            $table->dropIndex('reservations_client_status_created_idx');
            $table->dropIndex('reservations_tenant_created_idx');
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropIndex('subscriptions_status_next_due_idx');
        });

        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->dropIndex('sub_invoices_sub_status_cycle_idx');
        });

        Schema::table('discount_codes', function (Blueprint $table): void {
            $table->dropIndex('discount_codes_resort_code_idx');
        });
    }
};

