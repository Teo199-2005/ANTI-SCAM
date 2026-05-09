<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketer_payout_batches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('marketer_id')->constrained('users')->cascadeOnDelete();
            /** Calendar month when this payout run executes (Asia/Manila), e.g. 2026-05 */
            $table->string('run_period', 7);
            /** Sent to Xendit as reference_id; must be unique per payout attempt */
            $table->string('reference_id', 190)->unique();
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 3)->default('PHP');
            $table->string('status', 32)->default('submitted');
            $table->string('xendit_payout_id', 64)->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['marketer_id', 'run_period', 'status']);
        });

        Schema::create('marketer_payout_batch_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('batch_id')->constrained('marketer_payout_batches')->cascadeOnDelete();
            $table->foreignId('commission_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->timestamps();

            $table->index('commission_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->text('gcash_account_number')->nullable()->after('referral_code');
            $table->string('gcash_account_holder_name', 120)->nullable()->after('gcash_account_number');
        });

        Schema::table('commissions', function (Blueprint $table): void {
            $table->foreignId('payout_batch_id')
                ->nullable()
                ->after('status')
                ->constrained('marketer_payout_batches')
                ->nullOnDelete();
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::disableForeignKeyConstraints();
        }

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->unsignedBigInteger('released_by_tmp')->nullable();
        });

        DB::table('commission_releases')->update([
            'released_by_tmp' => DB::raw('released_by'),
        ]);

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropForeign(['released_by']);
        });

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropColumn('released_by');
        });

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
        });

        DB::table('commission_releases')->update([
            'released_by' => DB::raw('released_by_tmp'),
        ]);

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropColumn('released_by_tmp');
        });

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->string('release_source', 24)->default('manual')->after('released_by');
            $table->foreignId('payout_batch_id')
                ->nullable()
                ->after('release_source')
                ->constrained('marketer_payout_batches')
                ->nullOnDelete();
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::enableForeignKeyConstraints();
        }
    }

    public function down(): void
    {
        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropForeign(['payout_batch_id']);
            $table->dropColumn(['release_source', 'payout_batch_id']);
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::disableForeignKeyConstraints();
        }

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->unsignedBigInteger('released_by_tmp')->nullable();
        });

        DB::table('commission_releases')->update([
            'released_by_tmp' => DB::raw('released_by'),
        ]);

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropForeign(['released_by']);
        });

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropColumn('released_by');
        });

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->foreignId('released_by')->constrained('users')->cascadeOnDelete();
        });

        DB::table('commission_releases')->whereNull('released_by_tmp')->delete();
        DB::table('commission_releases')->update([
            'released_by' => DB::raw('released_by_tmp'),
        ]);

        Schema::table('commission_releases', function (Blueprint $table): void {
            $table->dropColumn('released_by_tmp');
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::enableForeignKeyConstraints();
        }

        Schema::table('commissions', function (Blueprint $table): void {
            $table->dropForeign(['payout_batch_id']);
            $table->dropColumn('payout_batch_id');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['gcash_account_number', 'gcash_account_holder_name']);
        });

        Schema::dropIfExists('marketer_payout_batch_items');
        Schema::dropIfExists('marketer_payout_batches');
    }
};
