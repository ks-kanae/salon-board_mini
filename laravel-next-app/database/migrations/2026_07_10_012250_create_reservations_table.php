<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {

            $table->id();

            $table->foreignId('salon_id')
                ->constrained('salons')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('staff_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->boolean('is_nominated')
                ->default(false);

            // 予約日時
            $table->dateTime('start_at')->index();

            $table->dateTime('end_at');

            // 予約状態
            $table->enum('status', [
                'pending',
                'confirmed',
                'cancelled',
                'completed',
            ])->default('pending');

            // 予約種別
            $table->enum('type', [
                'online',
                'manual',
                'next',
            ])->default('online');

            // スタッフメモ
            $table->text('notes')
                ->nullable();

            $table->timestamps();

            // 検索高速化
            $table->index([
                'salon_id',
                'start_at',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
