<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePaymentRequest;
use App\Models\Payment;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    // 会計情報取得
    public function show(Reservation $reservation)
    {
        $isClosingLocked = $reservation->payment
            && !$reservation->payment->is_draft
            && $reservation->payment->daily_closing_id !== null;

        return response()->json(array_merge(
            $reservation->load(['payment', 'menus', 'user'])->toArray(),
            ['is_closing_locked' => $isClosingLocked]
        ));
    }

    // 下書き保存
    public function saveDraft(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:0'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'memo' => ['nullable', 'string', 'max:500'],
            'method' => ['nullable', 'in:cash,credit,cashless'],
        ]);

        $payment = Payment::updateOrCreate(
            ['reservation_id' => $reservation->id],
            [
                'amount' => $validated['amount'],
                'discount' => $validated['discount'] ?? 0,
                'memo' => $validated['memo'] ?? null,
                'method' => $validated['method'] ?? null,
                'paid_at' => null,
                'sales_date' => null,
                'daily_closing_id' => null,
                'is_draft' => true,
            ]
        );

        return response()->json($payment);
    }

    // 会計確定
    public function confirm(StorePaymentRequest $request, Reservation $reservation)
    {
        $validated = $request->validated();

        if ($reservation->payment?->daily_closing_id !== null) {
            return response()->json(['message' => 'レジ締め済みのため、会計の変更はできません。'], 422);
        }

        $payment = Payment::updateOrCreate(
            ['reservation_id' => $reservation->id],
            [
                'amount' => $validated['amount'],
                'discount' => $validated['discount'] ?? 0,
                'memo' => $validated['memo'] ?? null,
                'method' => $validated['method'],
                'paid_at' => Carbon::now(),
                'sales_date' => null,
                'daily_closing_id' => null,
                'is_draft' => false,
            ]
        );

        $reservation->update(['status' => 'completed']);

        return response()->json($payment, 201);
    }

    // 会計取消し
    public function cancel(Reservation $reservation)
    {
        if (!$reservation->payment) {
            return response()->json(['message' => '会計情報がありません。'], 422);
        }

        if ($reservation->payment->daily_closing_id !== null) {
            return response()->json(['message' => 'レジ締め済みのため、会計取消しはできません。'], 422);
        }

        $reservation->payment->delete();
        $reservation->update(['status' => 'confirmed']);

        return response()->json(['message' => '会計を取消しました。']);
    }
}
