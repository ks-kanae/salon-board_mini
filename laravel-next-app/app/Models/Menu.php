<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id',
        'name',
        'category',
        'sort_order',
        'description',
        'price',
        'duration_minutes',
        'is_active',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function reservations()
    {
        return $this->belongsToMany(Reservation::class, 'reservation_menus')
            ->withPivot('price_at_booking')
            ->withTimestamps();
    }
}
