<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates all missing feature tables (idempotent — safe to re-run).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('room_images')) {
            Schema::create('room_images', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('room_id')->constrained()->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->string('path');
                $table->string('disk', 30)->default('public');
                $table->string('original_name')->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->boolean('is_primary')->default(false);
                $table->timestamps();
                $table->index(['room_id', 'sort_order']);
            });
        }

        if (! Schema::hasTable('discount_codes')) {
            Schema::create('discount_codes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->string('code', 60)->index();
                $table->string('type', 20)->default('fixed'); // fixed | percent
                $table->decimal('value', 10, 2)->default(0);
                $table->unsignedInteger('max_uses')->nullable();
                $table->unsignedInteger('used_count')->default(0);
                $table->date('valid_from')->nullable();
                $table->date('valid_until')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->unique(['tenant_id', 'code']);
            });
        }

        if (! Schema::hasTable('policy_acknowledgments')) {
            Schema::create('policy_acknowledgments', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
                $table->string('policy_version', 30)->default('v1');
                $table->json('snapshot')->nullable();
                $table->timestamp('acknowledged_at');
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();
                $table->index(['user_id', 'acknowledged_at']);
            });
        }

        if (! Schema::hasTable('email_logs')) {
            Schema::create('email_logs', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
                $table->string('type', 80);
                $table->string('to_email');
                $table->string('subject')->nullable();
                $table->string('status', 20)->default('queued'); // queued|sent|failed
                $table->text('error')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();
                $table->index(['tenant_id', 'type', 'status']);
            });
        }

        if (! Schema::hasTable('staff_notes')) {
            Schema::create('staff_notes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('note');
                $table->boolean('is_escalated')->default(false);
                $table->timestamps();
                $table->index(['reservation_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('marketer_resorts')) {
            Schema::create('marketer_resorts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('marketer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['marketer_id', 'resort_id']);
            });
        }

        if (! Schema::hasTable('commissions')) {
            Schema::create('commissions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('marketer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
                $table->string('period', 7);
                $table->decimal('gross_bookings', 12, 2)->default(0);
                $table->decimal('commission_rate', 5, 4)->default(0.05);
                $table->decimal('commission_amount', 10, 2)->default(0);
                $table->string('status', 20)->default('pending'); // pending|released
                $table->timestamps();
                $table->unique(['marketer_id', 'resort_id', 'period']);
            });
        }

        if (! Schema::hasTable('commission_releases')) {
            Schema::create('commission_releases', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('commission_id')->constrained()->cascadeOnDelete();
                $table->foreignId('released_by')->constrained('users')->cascadeOnDelete();
                $table->decimal('amount', 10, 2);
                $table->string('notes')->nullable();
                $table->timestamp('released_at');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table): void {
                $table->id();
                $table->string('key', 100)->unique();
                $table->text('value')->nullable();
                $table->string('type', 30)->default('string');
                $table->string('description')->nullable();
                $table->timestamps();
            });

            \DB::table('system_settings')->insert([
                ['key' => 'reservation_fee',     'value' => '500',   'type' => 'integer', 'description' => 'Fixed reservation fee in PHP', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'grace_period_days',    'value' => '5',     'type' => 'integer', 'description' => 'Subscription grace period in days', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'booking_lock_minutes', 'value' => '10',    'type' => 'integer', 'description' => 'Minutes a room lock is held during checkout', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'email_notifications',  'value' => 'true',  'type' => 'boolean', 'description' => 'Master toggle for all email notifications', 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'commission_rate',       'value' => '0.05',  'type' => 'string',  'description' => 'Default marketer commission rate (decimal)', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_releases');
        Schema::dropIfExists('commissions');
        Schema::dropIfExists('marketer_resorts');
        Schema::dropIfExists('staff_notes');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('policy_acknowledgments');
        Schema::dropIfExists('discount_codes');
        Schema::dropIfExists('room_images');
        Schema::dropIfExists('system_settings');
    }
};
