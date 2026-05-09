<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resort_landing_pages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resort_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            // Section 1 — Hero / Banner
            $table->string('section1_heading', 255)->nullable();
            $table->string('section1_subheading', 255)->nullable();
            $table->string('section1_bg_image_url')->nullable();
            $table->string('section1_cta_label', 100)->nullable();
            $table->string('section1_cta_url', 500)->nullable();

            // Section 2 — About / Gallery
            $table->string('section2_heading', 255)->nullable();
            $table->text('section2_body')->nullable();       // max 2000 enforced in validation
            $table->json('section2_gallery')->nullable();   // array of up to 6 image URLs
            $table->string('section2_cta_label', 100)->nullable();
            $table->string('section2_cta_url', 500)->nullable();

            $table->timestamps();

            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resort_landing_pages');
    }
};
