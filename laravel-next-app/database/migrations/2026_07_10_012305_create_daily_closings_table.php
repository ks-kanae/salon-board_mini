<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_closings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('salon_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('closed_by')
                ->constrained('users')
                ->cascadeOnDelete();

            // 締め対象日
            $table->date('date');

            // 実際に締めた日時
            $table->timestamp('closed_at')->nullable();

            $table->unsignedInteger('total_sales')->default(0);

            $table->unsignedInteger('total_count')->default(0);

            $table->string('memo')->nullable();

            $table->timestamps();

            $table->unique(['salon_id', 'date']);

            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_closings');
    }
};
