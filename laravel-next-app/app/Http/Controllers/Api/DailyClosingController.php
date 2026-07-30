<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDailyClosingRequest;
use App\Models\DailyClosing;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\ClosingService;
use App\Services\SalesService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DailyClosingController extends Controller
{
    public function __construct(
        private ClosingService $closingService,
        private SalesService $salesService
    ) {
    }

    public function show(Request $request)
    {
        $request->validate(['date' => ['required', 'date']]);

        $salonId = Auth::user()->salon_id;
        $date = Carbon::parse($request->date);

        $todayClosing = $this->closingService->getClosing($salonId, $date);
        $prevClosing = $this->closingService->getPrevClosing($salonId, $date);
        $summary = $this->salesService->getSummary($salonId, $date);

        // 当日の予約（全ステータス・キャンセル除く）
        $todayReservations = Reservation::with(['user', 'staff', 'menus', 'payment'])
            ->where('salon_id', $salonId)
            ->whereDate('start_at', $date->toDateString())
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_at')
            ->get();

        // 繰り越し予約：前回レジ締め後〜当日レジ締めまでに会計された過去日の予約
        $carryOverReservations = collect();
        if ($prevClosing) {
            $query = Payment::with(['reservation.user', 'reservation.staff', 'reservation.menus', 'reservation.payment'])
                ->where('is_draft', false)
                ->where('paid_at', '>', $prevClosing->closed_at)
                ->whereHas(
                    'reservation',
                    fn($q) => $q
                        ->where('salon_id', $salonId)
                        ->whereDate('start_at', '<', $date->toDateString())
                );
            if ($todayClosing) {
                $query->where('paid_at', '<=', $todayClosing->closed_at);
            }
            $carryOverReservations = $query->get()
                ->pluck('reservation')->filter()->unique('id')->values();
        }

        // レジ締め後に会計された当日の予約
        $afterClosingReservations = collect();
        if ($todayClosing) {
            $afterClosingReservations = Payment::with(['reservation.user', 'reservation.staff', 'reservation.menus', 'reservation.payment'])
                ->where('is_draft', false)
                ->where('paid_at', '>', $todayClosing->closed_at)
                ->whereHas(
                    'reservation',
                    fn($q) => $q
                        ->where('salon_id', $salonId)
                        ->whereDate('start_at', $date->toDateString())
                )
                ->get()
                ->pluck('reservation')->filter()->unique('id')->values();
        }

        // 未会計の予約（当日 + 前回レジ締め後の過去日）
        $unpaidReservations = Reservation::with(['user', 'staff', 'menus', 'payment'])
            ->where('salon_id', $salonId)
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($date, $prevClosing) {
                // 当日の未会計
                $q->where(function ($q2) use ($date) {
                    $q2->whereDate('start_at', $date->toDateString())
                        ->whereDoesntHave('payment', fn($p) => $p->where('is_draft', false));
                });
                // 前回レジ締め後〜当日の過去日未会計
                if ($prevClosing) {
                    $q->orWhere(function ($q3) use ($date, $prevClosing) {
                        $q3->whereDate('start_at', '<', $date->toDateString())
                            ->whereDate('start_at', '>', $prevClosing->date)
                            ->whereDoesntHave('payment', fn($p) => $p->where('is_draft', false));
                    });
                }
            })
            ->orderBy('start_at')
            ->get();

        return response()->json([
            'date' => $date->toDateString(),
            'is_closed' => $todayClosing !== null,
            'closing' => $todayClosing,
            'prev_closing' => $prevClosing,
            'today_reservations' => $todayReservations,
            'carry_over_reservations' => $carryOverReservations,
            'after_closing_reservations' => $afterClosingReservations,
            'unpaid_reservations' => $unpaidReservations,
            'total_sales' => $summary['total_sales'],
            'total_count' => $summary['total_count'],
            'breakdown' => $summary['breakdown'],
        ]);
    }

    public function salesSummary(Request $request)
    {
        $request->validate(['date' => ['required', 'date']]);
        $salonId = Auth::user()->salon_id;
        $date = Carbon::parse($request->date);
        return response()->json($this->salesService->getSummary($salonId, $date));
    }

    public function store(StoreDailyClosingRequest $request)
    {
        $salonId = Auth::user()->salon_id;
        $date = Carbon::parse($request->date);

        if ($this->closingService->getClosing($salonId, $date)) {
            return response()->json(['message' => 'この日はすでにレジ締め済みです。'], 422);
        }

        $closing = $this->closingService->execute(
            salonId: $salonId,
            closedBy: Auth::id(),
            date: $date,
            memo: $request->memo,
        );

        return response()->json($closing, 201);
    }

    public function index(Request $request)
    {
        $closings = DailyClosing::with('closedBy')
            ->where('salon_id', Auth::user()->salon_id)
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();
        return response()->json($closings);
    }
}
