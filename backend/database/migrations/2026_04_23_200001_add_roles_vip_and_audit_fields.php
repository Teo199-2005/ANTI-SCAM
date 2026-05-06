<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration bundle:
 *  1. Add `is_vip` to resorts
 *  2. Add `role`, `reason`, `ip_address` to audit_logs
 *  3. Add `no_show` and `completed` to reservation status enum
 *  4. Extend user roles: add marketing, admin_staff
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. VIP badge on resorts (idempotent — skip if already present)
        Schema::table('resorts', function (Blueprint $table): void {
            if (! Schema::hasColumn('resorts', 'is_vip')) {
                $table->boolean('is_vip')->default(false)->after('is_publicly_listed');
            }
        });

        // 2. Richer audit_logs (idempotent)
        Schema::table('audit_logs', function (Blueprint $table): void {
            if (! Schema::hasColumn('audit_logs', 'actor_role')) {
                $table->string('actor_role', 40)->nullable()->after('user_id');
            }
            if (! Schema::hasColumn('audit_logs', 'reason')) {
                $table->string('reason')->nullable()->after('metadata');
            }
            if (! Schema::hasColumn('audit_logs', 'ip_address')) {
                $table->string('ip_address', 45)->nullable()->after('reason');
            }
        });

        // 3. Extended reservation statuses
        // MySQL requires a full ENUM re-declaration; SQLite stores text and enforces
        // nothing at the DB layer, so only apply this on MySQL/MariaDB.
        if (\DB::getDriverName() === 'mysql') {
            \DB::statement("ALTER TABLE reservations MODIFY COLUMN status ENUM('pending_payment','confirmed','cancelled','expired','no_show','completed') NOT NULL DEFAULT 'pending_payment'");
        }
        // SQLite: no-op — new values are accepted by the text column already.
    }

    public function down(): void
    {
        Schema::table('resorts', function (Blueprint $table): void {
            $table->dropColumn('is_vip');
        });

        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropColumn(['actor_role', 'reason', 'ip_address']);
        });

        if (\DB::getDriverName() === 'mysql') {
            \DB::statement("ALTER TABLE reservations MODIFY COLUMN status ENUM('pending_payment','confirmed','cancelled','expired') NOT NULL DEFAULT 'pending_payment'");
        }
    }
};
