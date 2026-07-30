<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('salons', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('category', ['eyelash', 'nail', 'hair']);
            $table->string('address');
            $table->string('phone', 20);
            $table->unsignedTinyInteger('open_hour')->default(10);
            $table->unsignedTinyInteger('close_hour')->default(19);
            $table->unsignedTinyInteger('interval_minutes')->default(30);
            $table->boolean('is_active')->default(true);
            $table->json('closed_weekdays')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salons');
    }
};
