<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // SQLite enforces CHECK constraints for enum-like columns.
            // Rebuild table so plan can include basic/premium/vip.
            if (! Schema::hasTable('subscriptions_old')) {
                Schema::rename('subscriptions', 'subscriptions_old');
            }

            if (Schema::hasTable('subscriptions')) {
                Schema::drop('subscriptions');
            }

            Schema::create('subscriptions', function ($table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->enum('plan', ['basic', 'premium', 'vip'])->default('basic');
                $table->decimal('base_price', 10, 2)->default(0);
                $table->unsignedInteger('included_rooms')->default(3);
                $table->decimal('extra_room_fee', 10, 2)->default(0);
                $table->unsignedInteger('active_room_count')->default(0);
                $table->decimal('total_monthly_fee', 10, 2)->default(0);
                $table->date('billing_cycle_start');
                $table->date('billing_cycle_end');
                $table->date('next_due_date');
                $table->date('grace_until')->nullable();
                $table->enum('status', [
                    'active',
                    'pending_payment',
                    'grace_period',
                    'suspended',
                    'cancelled',
                ])->default('pending_payment');
                $table->timestamps();
            });

            DB::statement("
                INSERT INTO subscriptions (
                    id, tenant_id, resort_id, plan, base_price, included_rooms, extra_room_fee,
                    active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
                    next_due_date, grace_until, status, created_at, updated_at
                )
                SELECT
                    id, tenant_id, resort_id,
                    CASE WHEN plan = 'vip' THEN 'vip' ELSE 'basic' END as plan,
                    base_price, included_rooms, extra_room_fee,
                    active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
                    next_due_date, grace_until, status, created_at, updated_at
                FROM subscriptions_old
            ");

            Schema::drop('subscriptions_old');
            DB::statement('CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_status_next_due_date_index ON subscriptions (tenant_id, status, next_due_date)');
            return;
        }

        DB::table('subscriptions')->where('plan', 'standard')->update(['plan' => 'basic']);

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE subscriptions MODIFY plan ENUM('basic','premium','vip') NOT NULL DEFAULT 'basic'");
        }
    }

    public function down(): void
    {
        DB::table('subscriptions')->where('plan', 'basic')->update(['plan' => 'standard']);
        DB::table('subscriptions')->where('plan', 'premium')->update(['plan' => 'standard']);

        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE subscriptions MODIFY plan ENUM('standard','vip') NOT NULL DEFAULT 'standard'");
        }
    }
};

