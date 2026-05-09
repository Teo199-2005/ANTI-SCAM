<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('marketer_mailing_address')->nullable()->after('marketer_gov_id_document_url');
            $table->text('marketer_tin')->nullable()->after('marketer_mailing_address');
            $table->string('marketer_bank_name', 120)->nullable()->after('marketer_tin');
            $table->string('marketer_bank_branch', 120)->nullable()->after('marketer_bank_name');
            $table->string('marketer_bank_account_name', 120)->nullable()->after('marketer_bank_branch');
            $table->text('marketer_bank_account_number')->nullable()->after('marketer_bank_account_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'marketer_mailing_address',
                'marketer_tin',
                'marketer_bank_name',
                'marketer_bank_branch',
                'marketer_bank_account_name',
                'marketer_bank_account_number',
            ]);
        });
    }
};
