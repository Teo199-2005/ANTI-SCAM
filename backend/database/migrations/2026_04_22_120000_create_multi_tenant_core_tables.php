<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('subdomain')->unique();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->timestamps();
        });

        Schema::create('resorts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->boolean('is_publicly_listed')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_publicly_listed']);
        });

        Schema::create('rooms', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->unsignedInteger('capacity')->default(1);
            $table->decimal('base_price', 10, 2)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->unique(['resort_id', 'code']);
            $table->index(['tenant_id', 'resort_id', 'status']);
        });

        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->enum('plan', ['standard', 'vip'])->default('standard');
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
                'cancelled'
            ])->default('pending_payment');
            $table->timestamps();

            $table->index(['tenant_id', 'status', 'next_due_date']);
        });

        Schema::create('reservations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resort_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference_no')->unique();
            $table->date('check_in_date');
            $table->date('check_out_date');
            $table->unsignedInteger('guest_count')->default(1);
            $table->decimal('reservation_fee', 10, 2)->default(500);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('status', [
                'pending_payment',
                'confirmed',
                'cancelled',
                'expired'
            ])->default('pending_payment');
            $table->string('xendit_invoice_id')->nullable()->index();
            $table->enum('xendit_payment_status', [
                'pending',
                'paid',
                'failed',
                'expired'
            ])->nullable();
            $table->timestamp('reserved_at')->nullable();
            $table->timestamps();

            // ✅ FIXED: short index name (prevents MySQL 64-char limit error)
            $table->index(
                ['tenant_id', 'room_id', 'check_in_date', 'check_out_date'],
                'reservations_room_date_idx'
            );
        });

        Schema::create('booking_locks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('lock_token')->unique();
            $table->date('check_in_date');
            $table->date('check_out_date');
            $table->timestamp('expires_at');
            $table->enum('status', ['locked', 'released', 'converted'])->default('locked');
            $table->timestamps();

            $table->index(
                ['tenant_id', 'room_id', 'check_in_date', 'check_out_date', 'status'],
                'booking_locks_lookup_idx'
            );
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'entity_type', 'entity_id']);
            $table->index(['tenant_id', 'action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('booking_locks');
        Schema::dropIfExists('reservations');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('resorts');
        Schema::dropIfExists('tenants');
    }
};