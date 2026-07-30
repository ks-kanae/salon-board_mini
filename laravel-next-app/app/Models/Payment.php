<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'reservation_id',
        'daily_closing_id',
        'amount',
        'discount',
        'memo',
        'method',
        'paid_at',
        'sales_date',
        'is_draft',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'sales_date' => 'date',
        'is_draft' => 'boolean',
    ];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }

    // 割引後の実際の請求金額
    public function getFinalAmountAttribute(): int
    {
        return max(0, $this->amount - $this->discount);
    }

    public function dailyClosing()
    {
        return $this->belongsTo(DailyClosing::class);
    }

    public function scopeBetweenClosings($query, ?DailyClosing $prev, ?DailyClosing $current)
    {
        $query->where('is_draft', false)->whereNull('daily_closing_id');
        if ($prev) {
            $query->where('paid_at', '>', $prev->closed_at);
        }
        if ($current) {
            $query->where('paid_at', '<=', $current->closed_at);
        }
        return $query;
    }
}
