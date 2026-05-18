<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Standard (free) plan has no renewal end date — only Business Pro bills monthly.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $this->migrateSqliteNullableCycleEnd();

            return;
        }

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->date('billing_cycle_end')->nullable()->change();
            $table->date('next_due_date')->nullable()->change();
        });
    }

    private function migrateSqliteNullableCycleEnd(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            return;
        }

        $ddl = DB::selectOne("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'subscriptions'");
        $sql = (string) ($ddl->sql ?? '');
        if ($sql !== '' && str_contains($sql, 'billing_cycle_end" date') && ! preg_match('/billing_cycle_end" date not null/i', $sql)) {
            return;
        }

        DB::statement('PRAGMA foreign_keys=OFF');

        Schema::create('subscriptions_cycle_nullable', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->string('plan', 32)->default('standard');
            $table->json('feature_flags')->nullable();
            $table->decimal('base_price', 10, 2)->default(0);
            $table->unsignedInteger('included_rooms')->default(10);
            $table->decimal('extra_room_fee', 10, 2)->default(0);
            $table->unsignedInteger('active_room_count')->default(0);
            $table->decimal('total_monthly_fee', 10, 2)->default(0);
            $table->date('billing_cycle_start');
            $table->date('billing_cycle_end')->nullable();
            $table->date('next_due_date')->nullable();
            $table->date('grace_until')->nullable();
            $table->string('status', 32)->default('active');
            $table->string('billing_mode', 32)->nullable();
            $table->unsignedInteger('renewal_duration_months')->nullable();
            $table->string('xendit_customer_id')->nullable();
            $table->string('xendit_recurring_plan_id')->nullable();
            $table->string('xendit_payment_method_id')->nullable();
            $table->timestamp('recurring_activated_at')->nullable();
            $table->timestamp('recurring_cancelled_at')->nullable();
            $table->timestamps();
        });

        $columns = collect(DB::select('PRAGMA table_info(subscriptions)'))->pluck('name')->all();
        $optional = array_values(array_intersect([
            'feature_flags',
            'billing_mode',
            'renewal_duration_months',
            'xendit_customer_id',
            'xendit_recurring_plan_id',
            'xendit_payment_method_id',
            'recurring_activated_at',
            'recurring_cancelled_at',
        ], $columns));

        $selectCols = array_merge([
            'id', 'tenant_id', 'resort_id', 'plan', 'base_price', 'included_rooms', 'extra_room_fee',
            'active_room_count', 'total_monthly_fee', 'billing_cycle_start', 'billing_cycle_end',
            'next_due_date', 'grace_until', 'status', 'created_at', 'updated_at',
        ], $optional);

        $insertCols = array_merge([
            'id', 'tenant_id', 'resort_id', 'plan', 'base_price', 'included_rooms', 'extra_room_fee',
            'active_room_count', 'total_monthly_fee', 'billing_cycle_start', 'billing_cycle_end',
            'next_due_date', 'grace_until', 'status', 'created_at', 'updated_at',
        ], $optional);

        if (in_array('feature_flags', $columns, true)) {
            $idx = array_search('plan', $insertCols, true);
            array_splice($insertCols, $idx + 1, 0, ['feature_flags']);
            array_splice($selectCols, array_search('plan', $selectCols, true) + 1, 0, ['feature_flags']);
        }

        $colList = implode(', ', $insertCols);
        $selectList = implode(', ', $selectCols);

        DB::statement("INSERT INTO subscriptions_cycle_nullable ({$colList}) SELECT {$selectList} FROM subscriptions");

        Schema::drop('subscriptions');
        Schema::rename('subscriptions_cycle_nullable', 'subscriptions');
        DB::statement('CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_status_next_due_date_index ON subscriptions (tenant_id, status, next_due_date)');
        DB::statement('PRAGMA foreign_keys=ON');
    }

    public function down(): void
    {
        // Irreversible — Standard rows may have NULL cycle end dates.
    }
};
