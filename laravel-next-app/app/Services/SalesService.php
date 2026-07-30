<?php

namespace App\Services;

use App\Models\DailyClosing;
use App\Models\Payment;
use Carbon\Carbon;

class SalesService
{
    public function __construct(private ClosingService $closingService)
    {
    }

    /**
     * 指定日の売上集計
     * 前回レジ締め後〜当日レジ締めまでのpaymentを対象
     */
    public function getSummary(int $salonId, Carbon $date): array
    {
        $todayClosing = $this->closingService->getClosing($salonId, $date);
        $prevClosing = $this->closingService->getPrevClosing($salonId, $date);

        // レジ締め済みの場合はdaily_closing_idで集計
        if ($todayClosing) {
            $payments = Payment::whereHas('reservation', fn($q) => $q->where('salon_id', $salonId))
                ->where('daily_closing_id', $todayClosing->id)
                ->get();
        } else {
            // レジ締め前：前回レジ締め後〜現在までのpayment
            $payments = Payment::whereHas('reservation', fn($q) => $q->where('salon_id', $salonId))
                ->where('is_draft', false)
                ->whereNull('daily_closing_id')
                ->when($prevClosing, fn($q) => $q->where('paid_at', '>', $prevClosing->closed_at))
                ->get();
        }

        return $this->calcBreakdown($payments);
    }

    /**
     * collectionsから売上内訳を計算
     */
    public function calcBreakdown(\Illuminate\Support\Collection $payments): array
    {
        $total = $payments->sum(fn($p) => $p->final_amount);
        $breakdown = ['cash' => 0, 'credit' => 0, 'cashless' => 0];

        foreach ($payments as $p) {
            if ($p->method && isset($breakdown[$p->method])) {
                $breakdown[$p->method] += $p->final_amount;
            }
        }

        return [
            'total_sales' => $total,
            'total_count' => $payments->count(),
            'breakdown' => $breakdown,
        ];
    }
}
