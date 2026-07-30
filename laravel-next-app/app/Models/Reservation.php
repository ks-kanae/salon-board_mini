<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'salon_id',
        'user_id',
        'staff_id',
        'start_at',
        'end_at',
        'status',
        'type',
        'notes',
        'is_nominated',
    ];

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_nominated' => 'boolean',
    ];

    // 予約したお客様
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // 担当スタッフ
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    // 予約に紐づくメニュー
    public function menus()
    {
        return $this->belongsToMany(Menu::class, 'reservation_menus')
            ->withPivot('price_at_booking')
            ->withTimestamps();
    }

    // 会計情報
    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    protected static function booted(): void
    {
        // 新規ネット予約時に通知作成
        static::created(function (Reservation $reservation) {
            if ($reservation->type === 'online') {
                \App\Models\Notification::create([
                    'salon_id' => $reservation->salon_id,
                    'type' => 'new_reservation',
                    'reservation_id' => $reservation->id,
                ]);
            }
        });

        // updatedイベント（既存のに追加）
        static::updated(function (Reservation $reservation) {
            // キャンセル通知
            if ($reservation->wasChanged('status') && $reservation->status === 'cancelled' && $reservation->type === 'online') {
                \App\Models\Notification::create([
                    'salon_id' => $reservation->salon_id,
                    'type' => 'cancelled',
                    'reservation_id' => $reservation->id,
                ]);
            }
            // 来店回数更新（既存）
            if ($reservation->wasChanged('status') && $reservation->status === 'completed') {
                $customer = $reservation->user;
                if ($customer && $customer->isCustomer()) {
                    $customer->increment('visit_count');
                    $customer->update(['last_visited_at' => $reservation->start_at->toDateString()]);
                }
            }
        });

    }

    // 時間の重複チェック
    public static function hasConflict(string $startAt, string $endAt, ?int $excludeId = null, ?int $salonId = null, ?int $staffId = null): bool
    {
        $query = self::where('status', '!=', 'cancelled')
            ->where(function ($q) use ($startAt, $endAt) {
                $q->where('start_at', '<', $endAt)
                    ->where('end_at', '>', $startAt);
            });

        if ($salonId) {
            $query->where('salon_id', $salonId);
        }

        if ($staffId) {
            $query->where('staff_id', $staffId);
        }

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    // 当日かどうかのチェック
    public function isToday(): bool
    {
        return \Carbon\Carbon::parse($this->start_at)->isToday();
    }

    // 合計金額の計算
    public function getTotalPriceAttribute(): int
    {
        return $this->menus->sum('pivot.price_at_booking');
    }

    // 予約作成（メニューのアタッチ含む）
    public static function createWithMenus(
        int $salonId,
        int $userId,
        array $menuIds,
        string $startAt,
        string $type = 'online',
        ?string $notes = null,
        ?int $staffId = null,
        bool $isNominated = false
    ): self {
        $menus = \App\Models\Menu::whereIn('id', $menuIds)->get();
        $start = \Carbon\Carbon::parse($startAt);
        $end = $start->copy()->addMinutes($menus->sum('duration_minutes'));

        $reservation = self::create([
            'salon_id' => $salonId,
            'user_id' => $userId,
            'staff_id' => $staffId,
            'start_at' => $start,
            'end_at' => $end,
            'status' => 'confirmed',
            'type' => $type,
            'notes' => $notes,
            'is_nominated' => $isNominated,
        ]);

        foreach ($menus as $menu) {
            $reservation->menus()->attach($menu->id, [
                'price_at_booking' => $menu->price,
            ]);
        }

        return $reservation;
    }

    // 予約可能なスタッフを自動選択
    public static function findAvailableStaff(
        int $salonId,
        array $menuIds,
        string $startAt,
        string $endAt,
        string $date,
        ?int $preferredStaffId = null
    ): ?\App\Models\User {
        $staffList = User::where('role', 'staff')
            ->where('salon_id', $salonId)
            ->get();

        // 指名スタッフを先頭に並び替え
        if ($preferredStaffId) {
            $staffList = $staffList->sortBy(fn($s) => $s->id === $preferredStaffId ? 0 : 1);
        }

        foreach ($staffList as $staff) {
            // 出勤チェック
            if (!$staff->isWorkingOn($date))
                continue;

            // スキルチェック
            if (!$staff->canHandleMenus($menuIds))
                continue;

            // 時間帯の重複チェック
            $conflict = self::where('staff_id', $staff->id)
                ->where('status', '!=', 'cancelled')
                ->where('start_at', '<', $endAt)
                ->where('end_at', '>', $startAt)
                ->exists();

            // スケジュールブロックとの重複チェックを追加
            $blockConflict = \App\Models\ScheduleBlock::where('staff_id', $staff->id)
                ->where('start_at', '<', $endAt)
                ->where('end_at', '>', $startAt)
                ->exists();

            if (!$conflict && !$blockConflict) {
                return $staff;
            }
        }

        return null; // 対応可能スタッフなし
    }
}
