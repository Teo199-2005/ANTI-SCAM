<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hardens marketer payout batches:
 *  - Snapshots payout destination + payer-of-record fields at batch creation time so a
 *    marketer cannot mutate their GCash account between batch create and Xendit submit
 *    (account-takeover / mule mitigation).
 *  - Snapshots gross commission amount per line item so historical batches remain
 *    fully auditable even if `commissions.commission_amount` is mutated later.
 *  - Adds retry/backoff tracking so transient Xendit errors don't auto-abort the batch
 *    (which would cause a new reference_id and double-pay risk on the next run).
 *  - Adds a soft-cancel timestamp on items so failed batches preserve forensic state
 *    instead of being deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            // Encrypted snapshot of the destination GCash mobile (Laravel cast=encrypted).
            $table->text('gcash_account_number_snapshot')->nullable()->after('withholding_rate_applied');
            // Last 4 digits of the GCash mobile (cleartext) — for ops display without decrypting.
            $table->string('gcash_last4_snapshot', 8)->nullable()->after('gcash_account_number_snapshot');
            // Account holder name as sent to Xendit (snapshot).
            $table->string('gcash_account_holder_name_snapshot', 120)->nullable()->after('gcash_last4_snapshot');
            // Marketer's display name + email at the moment of disbursement (audit / 2307).
            $table->string('marketer_name_snapshot', 191)->nullable()->after('gcash_account_holder_name_snapshot');
            $table->string('marketer_email_snapshot', 191)->nullable()->after('marketer_name_snapshot');
            // Xendit submit retry tracking.
            $table->unsignedInteger('submit_attempts')->default(0)->after('marketer_email_snapshot');
            $table->timestamp('last_attempt_at')->nullable()->after('submit_attempts');
            $table->text('last_attempt_error')->nullable()->after('last_attempt_at');
            // Gateway error code (e.g. RECIPIENT_ACCOUNT_NUMBER_INVALID) for ops triage.
            $table->string('last_attempt_error_code', 80)->nullable()->after('last_attempt_error');
            // True only when ops/admin marks a batch unrecoverable (vs a normal Xendit FAILED webhook).
            $table->boolean('manually_aborted')->default(false)->after('last_attempt_error_code');
        });

        Schema::table('marketer_payout_batch_items', function (Blueprint $table): void {
            // Snapshot of commission_amount at batch-create time (gross, before withholding).
            $table->decimal('gross_commission_snapshot', 10, 2)->nullable()->after('amount');
            // When non-null, this line item is "soft-cancelled" — kept for audit, but no longer
            // counted as live (was previously deleted on batch failure, losing forensics).
            $table->timestamp('cancelled_at')->nullable()->after('gross_commission_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('marketer_payout_batch_items', function (Blueprint $table): void {
            $table->dropColumn(['gross_commission_snapshot', 'cancelled_at']);
        });

        Schema::table('marketer_payout_batches', function (Blueprint $table): void {
            $table->dropColumn([
                'gcash_account_number_snapshot',
                'gcash_last4_snapshot',
                'gcash_account_holder_name_snapshot',
                'marketer_name_snapshot',
                'marketer_email_snapshot',
                'submit_attempts',
                'last_attempt_at',
                'last_attempt_error',
                'last_attempt_error_code',
                'manually_aborted',
            ]);
        });
    }
};
