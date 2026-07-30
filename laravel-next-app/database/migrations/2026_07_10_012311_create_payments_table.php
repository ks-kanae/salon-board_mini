<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {

            $table->id();

            $table->foreignId('reservation_id')
                ->constrained()
                ->cascadeOnDelete();

            // レジ締め対象
            $table->foreignId('daily_closing_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->unsignedInteger('amount');

            $table->unsignedInteger('discount')
                ->default(0);

            $table->string('memo')
                ->nullable();

            $table->enum('method', [
                'cash',
                'credit',
                'cashless'
            ])->nullable();

            // 会計した日時
            $table->dateTime('paid_at')
                ->nullable()
                ->index();

            // 売上日
            $table->date('sales_date')
                ->nullable()
                ->index();

            // 下書き
            $table->boolean('is_draft')
                ->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
