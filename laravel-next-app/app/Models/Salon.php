<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salon extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'address',
        'phone',
        'open_hour',
        'close_hour',
        'interval_minutes',
        'is_active',
        'closed_weekdays'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'closed_weekdays' => 'array',
    ];

    public function menus()
    {
        return $this->hasMany(Menu::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function staffs()
    {
        return $this->hasMany(User::class)->where('role', 'staff');
    }

    public function closures()
    {
        return $this->hasMany(SalonClosure::class);
    }
}
