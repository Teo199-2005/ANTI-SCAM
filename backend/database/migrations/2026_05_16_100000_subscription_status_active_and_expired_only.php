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
            if (! Schema::hasTable('subscriptions')) {
                return;
            }

            $source = 'subscriptions_status_migrate_src';
            if (Schema::hasTable($source)) {
                Schema::drop($source);
            }

            Schema::rename('subscriptions', $source);

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
                $table->enum('status', ['active', 'expired'])->default('active');
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
                    next_due_date, NULL as grace_until,
                    CASE WHEN status IN ('expired', 'suspended') THEN 'expired' ELSE 'active' END as status,
                    created_at, updated_at
                FROM {$source}
            ");

            Schema::drop($source);
            DB::statement('CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_status_next_due_date_index ON subscriptions (tenant_id, status, next_due_date)');

            return;
        }

        DB::table('subscriptions')
            ->whereIn('status', ['pending_payment', 'grace_period', 'cancelled'])
            ->update(['status' => 'active', 'grace_until' => null]);

        DB::table('subscriptions')
            ->where('status', 'suspended')
            ->update(['status' => 'expired', 'grace_until' => null]);

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('active','expired') NOT NULL DEFAULT 'active'");
        }
    }

    public function down(): void
    {
        // Irreversible enum shrink in production; no-op on rollback.
    }
};
