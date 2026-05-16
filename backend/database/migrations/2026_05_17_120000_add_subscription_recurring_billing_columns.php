<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->string('billing_mode', 32)->default('manual')->after('status');
            $table->unsignedTinyInteger('renewal_duration_months')->default(1)->after('billing_mode');
            $table->string('xendit_customer_id')->nullable()->after('renewal_duration_months');
            $table->string('xendit_recurring_plan_id')->nullable()->after('xendit_customer_id');
            $table->string('xendit_payment_method_id')->nullable()->after('xendit_recurring_plan_id');
            $table->timestamp('recurring_activated_at')->nullable()->after('xendit_payment_method_id');
            $table->timestamp('recurring_cancelled_at')->nullable()->after('recurring_activated_at');

            $table->index(['billing_mode', 'next_due_date'], 'subscriptions_billing_mode_due_idx');
        });

        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->string('source', 32)->default('checkout')->after('status');
            $table->string('xendit_recurring_cycle_id')->nullable()->after('xendit_invoice_url');

            $table->unique('xendit_recurring_cycle_id', 'subscription_invoices_recurring_cycle_unique');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table): void {
            $table->dropUnique('subscription_invoices_recurring_cycle_unique');
            $table->dropColumn(['source', 'xendit_recurring_cycle_id']);
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropIndex('subscriptions_billing_mode_due_idx');
            $table->dropColumn([
                'billing_mode',
                'renewal_duration_months',
                'xendit_customer_id',
                'xendit_recurring_plan_id',
                'xendit_payment_method_id',
                'recurring_activated_at',
                'recurring_cancelled_at',
            ]);
        });
    }
};
