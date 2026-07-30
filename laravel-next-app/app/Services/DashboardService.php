<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Reservation;
use Carbon\Carbon;

class DashboardService
{
    public function __construct(
        private ClosingService $closingService,
        private SalesService $salesService
    ) {
    }

    /**
     * 指定日のダッシュボードデータを構築
     */
    public function build(int $salonId, Carbon $date): array
    {
        $todayClosing = $this->closingService->getClosing($salonId, $date);
        $prevClosing = $this->closingService->getPrevClosing($salonId, $date);

        // 当日の予約（キャンセル除く）
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
                ->pluck('reservation')
                ->filter()
                ->unique('id')
                ->values();
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
                ->pluck('reservation')
                ->filter()
                ->unique('id')
                ->values();
        }

        $summary = $this->salesService->getSummary($salonId, $date);

        return [
            'date' => $date->toDateString(),
            'today_reservations' => $todayReservations,
            'carry_over_reservations' => $carryOverReservations,
            'after_closing_reservations' => $afterClosingReservations,
            'today_closing' => $todayClosing,
            'prev_closing' => $prevClosing,
            'sales_summary' => $summary,
        ];
    }
}
