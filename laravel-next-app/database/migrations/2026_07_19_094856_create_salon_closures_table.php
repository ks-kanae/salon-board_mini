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
        Schema::create('salon_closures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('type', ['closed', 'suspended']); // closed=定休日、suspended=予約停止
            $table->string('reason')->nullable(); // メモ
            $table->timestamps();

            $table->unique(['salon_id', 'date']); // 同じ日に重複登録しない
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salon_closures');
    }
};
