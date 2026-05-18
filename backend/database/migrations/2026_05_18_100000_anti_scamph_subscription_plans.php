<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  public function up(): void
  {
    $driver = DB::getDriverName();

    if ($driver === 'sqlite') {
      $this->migrateSqlitePlansAndStatus();
    } else {
      if ($driver === 'mysql') {
        DB::statement("ALTER TABLE subscriptions MODIFY plan VARCHAR(32) NOT NULL DEFAULT 'standard'");
        DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('active','grace_period','expired') NOT NULL DEFAULT 'active'");
      }
    }

    DB::table('subscriptions')->whereIn('plan', ['basic', 'standard'])->update(['plan' => 'standard']);
    DB::table('subscriptions')->whereIn('plan', ['premium', 'vip'])->update(['plan' => 'business_pro']);

    DB::table('subscriptions')->where('plan', 'business_pro')->update([
      'included_rooms' => 20,
      'base_price' => 1000,
      'extra_room_fee' => 0,
    ]);
    DB::table('subscriptions')->where('plan', 'standard')->update([
      'included_rooms' => 10,
      'base_price' => 0,
      'extra_room_fee' => 0,
    ]);

    DB::table('subscriptions')->where('status', 'expired')->update(['status' => 'active']);

    if (! Schema::hasColumn('subscriptions', 'feature_flags')) {
      Schema::table('subscriptions', function (Blueprint $table): void {
        $table->json('feature_flags')->nullable()->after('plan');
      });
    }

    if (! Schema::hasColumn('resorts', 'verification_status')) {
      Schema::table('resorts', function (Blueprint $table): void {
        $table->string('verification_status', 32)->default('pending')->after('is_vip');
      });
    }

    DB::table('resorts')->where('is_vip', true)->update(['verification_status' => 'verified']);

    DB::table('resorts')
      ->where('is_publicly_listed', true)
      ->whereNull('verification_status')
      ->update(['verification_status' => 'verified']);
  }

  private function migrateSqlitePlansAndStatus(): void
  {
    if (! Schema::hasTable('subscriptions')) {
      return;
    }

    $ddl = DB::selectOne("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'subscriptions'");
    $sql = (string) ($ddl->sql ?? '');
    if ($sql !== '' && str_contains($sql, "'grace_period'") && str_contains($sql, "'standard'")) {
      return;
    }

    DB::statement('PRAGMA foreign_keys=OFF');

    Schema::create('subscriptions_plans_next', function (Blueprint $table): void {
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
      $table->date('billing_cycle_end');
      $table->date('next_due_date');
      $table->date('grace_until')->nullable();
      $table->enum('status', ['active', 'grace_period', 'expired'])->default('active');
      $table->string('billing_mode', 32)->nullable();
      $table->unsignedInteger('renewal_duration_months')->nullable();
      $table->string('xendit_customer_id')->nullable();
      $table->string('xendit_recurring_plan_id')->nullable();
      $table->string('xendit_payment_method_id')->nullable();
      $table->timestamp('recurring_activated_at')->nullable();
      $table->timestamp('recurring_cancelled_at')->nullable();
      $table->timestamps();
    });

    $hasBillingMode = Schema::hasColumn('subscriptions', 'billing_mode');

    if ($hasBillingMode) {
      DB::statement("
        INSERT INTO subscriptions_plans_next (
          id, tenant_id, resort_id, plan, feature_flags, base_price, included_rooms, extra_room_fee,
          active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
          next_due_date, grace_until, status, billing_mode, renewal_duration_months,
          xendit_customer_id, xendit_recurring_plan_id, xendit_payment_method_id,
          recurring_activated_at, recurring_cancelled_at, created_at, updated_at
        )
        SELECT
          id, tenant_id, resort_id,
          CASE WHEN plan IN ('premium','vip','business_pro') THEN 'business_pro' ELSE 'standard' END,
          NULL, base_price, included_rooms, extra_room_fee,
          active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
          next_due_date, grace_until,
          CASE WHEN status = 'expired' THEN 'active' WHEN status = 'grace_period' THEN 'grace_period' ELSE 'active' END,
          billing_mode, renewal_duration_months,
          xendit_customer_id, xendit_recurring_plan_id, xendit_payment_method_id,
          recurring_activated_at, recurring_cancelled_at, created_at, updated_at
        FROM subscriptions
      ");
    } else {
      DB::statement("
        INSERT INTO subscriptions_plans_next (
          id, tenant_id, resort_id, plan, feature_flags, base_price, included_rooms, extra_room_fee,
          active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
          next_due_date, grace_until, status, created_at, updated_at
        )
        SELECT
          id, tenant_id, resort_id,
          CASE WHEN plan IN ('premium','vip','business_pro') THEN 'business_pro' ELSE 'standard' END,
          NULL, base_price, included_rooms, extra_room_fee,
          active_room_count, total_monthly_fee, billing_cycle_start, billing_cycle_end,
          next_due_date, grace_until,
          CASE WHEN status = 'expired' THEN 'active' WHEN status = 'grace_period' THEN 'grace_period' ELSE 'active' END,
          created_at, updated_at
        FROM subscriptions
      ");
    }

    Schema::drop('subscriptions');
    Schema::rename('subscriptions_plans_next', 'subscriptions');
    DB::statement('CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_status_next_due_date_index ON subscriptions (tenant_id, status, next_due_date)');
    DB::statement('PRAGMA foreign_keys=ON');
  }

  public function down(): void
  {
    // Irreversible production migration.
  }
};
