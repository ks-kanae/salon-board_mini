<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'skills',
        'visit_count',
        'last_visited_at',
        'salon_id',
        'address',
        'memo',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'skills' => 'array',
        'last_visited_at' => 'date',
    ];

    // このユーザーが持つ予約（お客様として）
    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'user_id');
    }

    // このスタッフが担当する予約
    public function staffReservations()
    {
        return $this->hasMany(Reservation::class, 'staff_id');
    }

    // スタッフかどうか
    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    // お客様かどうか
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function shifts()
    {
        return $this->hasMany(Shift::class);
    }

    // 指定日に出勤しているか
    public function isWorkingOn(string $date): bool
    {
        $shift = $this->shifts()->where('date', $date)->first();
        // シフト登録がなければデフォルト出勤
        return $shift === null || $shift->is_working;
    }

    // 指定メニューに対応しているか
    public function canHandleMenus(array $menuIds): bool
    {
        // skillsが空（null）ならすべて対応可能
        if (empty($this->skills)) {
            return true;
        }
        return empty(array_diff($menuIds, $this->skills));
    }
}
