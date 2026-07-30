<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStaffReservationRequest;
use App\Http\Requests\Api\UpdateStaffReservationRequest;
use App\Models\Menu;
use App\Models\Reservation;
use App\Models\DailyClosing;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\DashboardService;

class StaffReservationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    // スタッフ用：全予約一覧（日付・月フィルタ対応）
    public function __construct(
        private DashboardService $dashboardService
    ) {
    }

    // スタッフ用：全予約一覧
    public function index(Request $request)
    {
        $salonId = Auth::user()->salon_id;

        $query = Reservation::with(['user', 'staff', 'menus', 'payment'])
            ->where('salon_id', $salonId)
            ->orderBy('start_at');

        if ($request->filled('date')) {
            $query->whereDate('start_at', Carbon::parse($request->date));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('start_at', '>=', Carbon::parse($request->date_from));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('start_at', '<=', Carbon::parse($request->date_to));
        }
        if ($request->filled('month')) {
            $month = Carbon::parse($request->month);
            $query->whereYear('start_at', $month->year)
                ->whereMonth('start_at', $month->month);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        if ($request->filled('staff_id') && $request->staff_id !== 'all') {
            $query->where('staff_id', $request->staff_id);
        }
        if ($request->filled('customer_name')) {
            $query->whereHas('user', fn($q) => $q->where('name', 'like', '%' . $request->customer_name . '%'));
        }

        // ページネーションが必要な場合
        if ($request->filled('paginate')) {
            return response()->json($query->paginate(20));
        }


        return response()->json($query->get());
    }

    // 未会計・繰り越し予約取得
    // 未会計・繰り越し予約取得
    public function unpaidPast()
    {
        $salonId = Auth::user()->salon_id;
        $today = Carbon::today('Asia/Tokyo');
        $prevClosing = DailyClosing::previous($salonId, $today)->first();

        return response()->json(
            Reservation::with(['user', 'staff', 'menus', 'payment'])
                ->where('salon_id', $salonId)
                ->whereDate('start_at', '<', $today)
                ->where('status', '!=', 'cancelled')
                ->where(function ($q) use ($prevClosing) {
                    // 未会計
                    $q->whereDoesntHave('payment', fn($p) => $p->where('is_draft', false));
                    // 前回レジ締め後に会計したがまだ次のレジ締め未確定
                    $q->orWhereHas('payment', function ($q2) use ($prevClosing) {
                        $q2->where('is_draft', false)->whereNull('daily_closing_id');
                        if ($prevClosing) {
                            $q2->where('paid_at', '>', $prevClosing->closed_at);
                        }
                    });
                })
                ->orderBy('start_at', 'desc')
                ->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    // スタッフ用：手動・次回予約作成
    public function store(StoreStaffReservationRequest $request)
    {
        $validated = $request->validated();
        $salonId = Auth::user()->salon_id;

        // 顧客を特定または作成
        if (!empty($validated['customer_id'])) {
            // 既存顧客
            $customer = \App\Models\User::find($validated['customer_id']);
            if (!$customer) {
                return response()->json(['message' => '顧客が見つかりません。'], 422);
            }
            $userId = $customer->id;
            // 電話番号が渡されていれば更新
            if (!empty($validated['customer_phone']) && empty($customer->phone)) {
                $customer->update(['phone' => $validated['customer_phone']]);
            }
        } else {
            // 新規顧客として作成（または電話番号で検索）
            $existingUser = null;
            if (!empty($validated['customer_phone'])) {
                $existingUser = \App\Models\User::where('phone', $validated['customer_phone'])
                    ->where('role', 'customer')
                    ->first();
            }

            if ($existingUser) {
                $userId = $existingUser->id;
            } else {
                $newCustomer = \App\Models\User::create([
                    'name' => $validated['customer_name'],
                    'email' => 'manual_' . time() . '_' . rand(1000, 9999) . '@salon.local',
                    'password' => bcrypt(\Illuminate\Support\Str::random(16)),
                    'role' => 'customer',
                    'phone' => $validated['customer_phone'] ?? null,
                    'salon_id' => $salonId,
                ]);
                $userId = $newCustomer->id;
            }
        }

        // 重複チェック
        $menus = Menu::whereIn('id', $validated['menu_ids'])->get();
        $startAt = Carbon::parse($validated['start_at']);
        $endAt = $startAt->copy()->addMinutes($menus->sum('duration_minutes'));

        $blockConflict = \App\Models\ScheduleBlock::where('salon_id', $salonId)
            ->where('staff_id', $validated['staff_id'] ?? Auth::id())
            ->where('start_at', '<', $endAt->toDateTimeString())
            ->where('end_at', '>', $startAt->toDateTimeString())
            ->exists();

        if ($blockConflict) {
            return response()->json(['message' => 'この時間帯には予定が入っています。'], 409);
        }

        if (Reservation::hasConflict($startAt, $endAt, salonId: $salonId, staffId: $validated['staff_id'] ?? Auth::id(), )) {
            return response()->json(['message' => 'この時間帯はすでに予約が入っています。'], 409);
        }

        $reservation = Reservation::createWithMenus(
            salonId: $salonId,
            userId: $userId,
            menuIds: $validated['menu_ids'],
            startAt: $validated['start_at'],
            type: $validated['type'],
            notes: $validated['notes'] ?? null,
            staffId: $validated['staff_id'] ?? Auth::id(),
            isNominated: $validated['is_nominated'] ?? false,
        );

        return response()->json($reservation->load(['menus', 'staff', 'user']), 201);
    }

    /**
     * Update the specified resource in storage.
     */
    // スタッフ用：予約更新
    public function update(UpdateStaffReservationRequest $request, Reservation $reservation)
    {
        $validated = $request->validated();

        if (isset($validated['start_at']) && isset($validated['end_at'])) {
            $startAt = Carbon::parse($validated['start_at']);
            $endAt = Carbon::parse($validated['end_at']);

            // 現在の予約のstart_atと同じ場合は過去チェックをスキップ
            $currentStart = Carbon::parse($reservation->start_at);
            $isStartChanged = !$startAt->eq($currentStart);

            if ($isStartChanged) {
                $startAtJst = $startAt->copy()->setTimezone('Asia/Tokyo');
                if ($startAtJst->isPast()) {
                    return response()->json([
                        'message' => '過去の日時には変更できません。',
                        'conflict' => false,
                    ], 422);
                }

                // 営業時間チェックも変更時のみ
                $salon = \App\Models\Salon::find(Auth::user()->salon_id);
                if ($salon) {
                    $openHour = $startAt->copy()->setHour($salon->open_hour)->setMinute(0)->setSecond(0);
                    $closeHour = $endAt->copy()->setHour($salon->close_hour)->setMinute(0)->setSecond(0);
                    if ($startAt->lt($openHour) || $endAt->gt($closeHour)) {
                        return response()->json([
                            'message' => '営業時間外への変更はできません。',
                            'conflict' => false,
                        ], 422);
                    }
                }
            }

            $force = $request->input('force', false);
            $conflict = Reservation::hasConflict(
                $startAt->toDateTimeString(),
                $endAt->toDateTimeString(),
                excludeId: $reservation->id,
                salonId: Auth::user()->salon_id,
                staffId: $validated['staff_id'] ?? $reservation->staff_id,
            );

            // スケジュールブロックとの重複チェック
            $blockConflict = \App\Models\ScheduleBlock::where('salon_id', Auth::user()->salon_id)
                ->where('staff_id', $validated['staff_id'] ?? $reservation->staff_id)
                ->where('start_at', '<', $endAt->toDateTimeString())
                ->where('end_at', '>', $startAt->toDateTimeString())
                ->exists();

            if (($conflict || $blockConflict) && !$force) {
                return response()->json([
                    'message' => 'この日時には他の予約が入っています。変更しますか？',
                    'conflict' => true,
                ], 409);
            }

            $validated['start_at'] = $startAt->toDateTimeString();
            $validated['end_at'] = $endAt->toDateTimeString();
        }

        $reservation->update($validated);
        return response()->json($reservation->load(['user', 'staff', 'menus', 'payment']));
    }

    // スタッフ用：メニュー変更
    public function updateMenus(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'menu_ids' => ['required', 'array', 'min:1'],
            'menu_ids.*' => ['exists:menus,id'],
        ]);

        $menus = \App\Models\Menu::whereIn('id', $validated['menu_ids'])->get();

        // 中間テーブルを更新
        $syncData = [];
        foreach ($menus as $menu) {
            $syncData[$menu->id] = ['price_at_booking' => $menu->price];
        }
        $reservation->menus()->sync($syncData);

        // end_atも更新
        $start = \Carbon\Carbon::parse($reservation->start_at);
        $reservation->update([
            'end_at' => $start->copy()->addMinutes($menus->sum('duration_minutes')),
        ]);

        return response()->json($reservation->load(['menus', 'user', 'staff', 'payment']));
    }

    /**
     * Remove the specified resource from storage.
     */
    // スタッフ用：予約削除
    public function destroy(Reservation $reservation)
    {
        $reservation->delete();
        return response()->noContent();
    }
}
