<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'verification_rejection_reason')) {
                $table->text('verification_rejection_reason')->nullable()->after('verified_at');
            }
            if (! Schema::hasColumn('resorts', 'verification_submission_count')) {
                $table->unsignedSmallInteger('verification_submission_count')->default(0)->after('verification_rejection_reason');
            }
            if (! Schema::hasColumn('resorts', 'verification_assigned_to_user_id')) {
                $table->foreignId('verification_assigned_to_user_id')->nullable()->after('verification_submission_count')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('resorts', 'verification_admin_notes')) {
                $table->text('verification_admin_notes')->nullable()->after('verification_assigned_to_user_id');
            }
            if (! Schema::hasColumn('resorts', 'verification_scheduled_at')) {
                $table->timestamp('verification_scheduled_at')->nullable()->after('verification_admin_notes');
            }
            if (! Schema::hasColumn('resorts', 'verification_scheduled_notes')) {
                $table->string('verification_scheduled_notes', 500)->nullable()->after('verification_scheduled_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            if (Schema::hasColumn('resorts', 'verification_assigned_to_user_id')) {
                $table->dropConstrainedForeignId('verification_assigned_to_user_id');
            }
            foreach ([
                'verification_scheduled_notes',
                'verification_scheduled_at',
                'verification_admin_notes',
                'verification_submission_count',
                'verification_rejection_reason',
            ] as $col) {
                if (Schema::hasColumn('resorts', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
