<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreReservationRequest;
use App\Models\Menu;
use App\Models\Reservation;
use App\Models\Salon;
use Illuminate\Support\Facades\Auth;

class ReservationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    // お客様の予約一覧（全サロン）
    public function index()
    {
        return response()->json(
            Reservation::with(['salon', 'menus', 'staff', 'payment'])
                ->where('user_id', Auth::id())
                ->orderBy('start_at', 'desc')
                ->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    // 予約作成
    public function store(StoreReservationRequest $request)
    {
        $validated = $request->validated();

        $salon = Salon::findOrFail($validated['salon_id']);

        // 有効なメニューかチェック
        $activeMenuCount = Menu::whereIn('id', $validated['menu_ids'])
            ->where('salon_id', $salon->id)
            ->where('is_active', true)
            ->count();

        if ($activeMenuCount !== count($validated['menu_ids'])) {
            return response()->json(['message' => '無効なメニューが含まれています。'], 422);
        }

        // 重複チェック
        $menus = Menu::whereIn('id', $validated['menu_ids'])->get();
        $startAt = \Carbon\Carbon::parse($validated['start_at']);
        $endAt = $startAt->copy()->addMinutes($menus->sum('duration_minutes'));
        $date = $startAt->toDateString();

        // 対応可能スタッフを自動選択（指名優先）
        $staff = Reservation::findAvailableStaff(
            salonId: $salon->id,
            menuIds: $validated['menu_ids'],
            startAt: $startAt->toDateTimeString(),
            endAt: $endAt->toDateTimeString(),
            date: $date,
            preferredStaffId: $validated['preferred_staff_id'] ?? null,
        );

        if (!$staff) {
            return response()->json([
                'message' => 'ご指定の日時は対応可能なスタッフが不在です。別の日時をお選びください。'
            ], 409);
        }

        // 全体の重複チェック
        $reservation = Reservation::createWithMenus(
            salonId: $salon->id,
            userId: Auth::id(),
            menuIds: $validated['menu_ids'],
            startAt: $validated['start_at'],
            type: 'online',
            notes: $validated['notes'] ?? null,
            staffId: $staff->id,
            isNominated: isset($validated['preferred_staff_id']),
        );

        return response()->json($reservation->load(['salon', 'menus', 'staff']), 201);
    }

    /**
     * Display the specified resource.
     */
    // 予約詳細
    public function show(Reservation $reservation)
    {
        abort_if($reservation->user_id !== Auth::id(), 403, '権限がありません。');

        return response()->json($reservation->load(['salon', 'menus', 'staff', 'payment']));
    }

    // 予約キャンセル
    public function cancel(Reservation $reservation)
    {
        abort_if($reservation->user_id !== Auth::id(), 403, '権限がありません。');

        if ($reservation->isToday()) {
            return response()->json([
                'message' => '当日のキャンセルはできません。サロンに直接ご連絡ください。'
            ], 422);
        }

        if ($reservation->status === 'cancelled') {
            return response()->json(['message' => 'すでにキャンセル済みです。'], 422);
        }

        $reservation->update(['status' => 'cancelled']);

        return response()->json($reservation);
    }
}
