<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('marketer_gov_id_type', 40)->nullable()->after('gcash_account_holder_name');
            $table->text('marketer_gov_id_number')->nullable()->after('marketer_gov_id_type');
            $table->string('marketer_gov_id_document_url', 512)->nullable()->after('marketer_gov_id_number');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'marketer_gov_id_type',
                'marketer_gov_id_number',
                'marketer_gov_id_document_url',
            ]);
        });
    }
};
