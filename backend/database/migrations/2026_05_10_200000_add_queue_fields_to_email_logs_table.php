<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_logs', function (Blueprint $table): void {
            $table->longText('html_body')->nullable()->after('subject');
            $table->string('to_name', 190)->nullable()->after('to_email');
            $table->uuid('correlation_id')->nullable()->after('metadata');
            $table->index('correlation_id');
        });
    }

    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table): void {
            $table->dropIndex(['correlation_id']);
            $table->dropColumn(['html_body', 'to_name', 'correlation_id']);
        });
    }
};
