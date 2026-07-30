<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DailyClosing extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id',
        'closed_by',
        'date',
        'closed_at',
        'total_sales',
        'total_count',
        'memo',
    ];

    protected $casts = [
        'date' => 'date',
        'closed_at' => 'datetime',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function scopePrevious($query, int $salonId, Carbon $date)
    {
        return $query->where('salon_id', $salonId)
            ->whereDate('date', '<', $date->toDateString())
            ->orderByDesc('date');
    }

    public function scopeForDate($query, int $salonId, Carbon $date)
    {
        return $query->where('salon_id', $salonId)
            ->whereDate('date', $date->toDateString());
    }
}
