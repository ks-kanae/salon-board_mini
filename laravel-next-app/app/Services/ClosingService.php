<?php

namespace App\Services;

use App\Models\DailyClosing;
use App\Models\Payment;
use Carbon\Carbon;

class ClosingService
{
    /**
     * 指定サロン・日付の当日レジ締めを取得
     */
    public function getClosing(int $salonId, Carbon $date): ?DailyClosing
    {
        return DailyClosing::forDate($salonId, $date)->first();
    }

    /**
     * 前回のレジ締めを取得
     */
    public function getPrevClosing(int $salonId, Carbon $date): ?DailyClosing
    {
        return DailyClosing::previous($salonId, $date)->first();
    }

    /**
     * レジ締め対象のpaymentを取得
     * 前回レジ締め後〜now()まで かつ daily_closing_id が未設定
     */
    public function getTargetPayments(int $salonId, Carbon $closedAt): \Illuminate\Support\Collection
    {
        $prevClosing = DailyClosing::where('salon_id', $salonId)
            ->where('closed_at', '<', $closedAt)
            ->orderByDesc('closed_at')
            ->first();

        return Payment::scopeBetweenClosings(
            Payment::whereHas('reservation', fn($q) => $q->where('salon_id', $salonId)),
            $prevClosing,
            null
        )->where('paid_at', '<=', $closedAt)->get();
    }

    /**
     * レジ締め実行
     */
    public function execute(int $salonId, int $closedBy, Carbon $date, ?string $memo): DailyClosing
    {
        $closedAt = now();
        $prevClosing = $this->getPrevClosing($salonId, $date);

        $query = Payment::whereHas('reservation', fn($q) => $q->where('salon_id', $salonId))
            ->betweenClosings($prevClosing, null)
            ->where('paid_at', '<=', $closedAt);

        $payments = $query->get();
        $totalSales = $payments->sum(fn($p) => $p->final_amount);

        $closing = DailyClosing::create([
            'salon_id' => $salonId,
            'closed_by' => $closedBy,
            'date' => $date->toDateString(),
            'closed_at' => $closedAt,
            'total_sales' => $totalSales,
            'total_count' => $payments->count(),
            'memo' => $memo,
        ]);

        // paymentにdaily_closing_idとsales_dateを付与
        $query->update([
            'daily_closing_id' => $closing->id,
            'sales_date' => $date->toDateString(),
        ]);

        return $closing;
    }
}
