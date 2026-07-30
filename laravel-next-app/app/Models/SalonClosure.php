<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class SalonClosure extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id',
        'date',
        'type',
        'reason',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    // 月指定スコープ
    public function scopeInMonth($query, string $month)
    {
        $start = Carbon::parse($month)->startOfMonth()->toDateString();
        $end = Carbon::parse($month)->endOfMonth()->toDateString();
        return $query->whereBetween('date', [$start, $end]);
    }
}
