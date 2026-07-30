<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\BulkSalonClosureRequest;
use App\Http\Requests\Api\StoreSalonClosureRequest;
use App\Http\Requests\Api\UpdateClosedWeekdaysRequest;
use App\Models\Salon;
use App\Models\SalonClosure;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SalonClosureController extends Controller
{
    // 指定月の休業日一覧を取得
    public function index(Request $request)
    {
        $request->validate(['month' => ['required', 'date']]);
        $salonId = Auth::user()->salon_id;

        $closures = SalonClosure::where('salon_id', $salonId)
            ->inMonth($request->month)
            ->get()
            ->map(function ($closure) {
                return [
                    'id' => $closure->id,
                    'date' => $closure->getRawOriginal('date'),
                    'type' => $closure->type,
                    'reason' => $closure->reason,
                ];
            });

        $salon = Salon::find($salonId);

        return response()->json([
            'closures' => $closures,
            'closed_weekdays' => $salon->closed_weekdays ?? [],
        ]);
    }

    // 定休曜日を更新
    public function updateWeekdays(UpdateClosedWeekdaysRequest $request)
    {
        $salon = Salon::find(Auth::user()->salon_id);
        $salon->update(['closed_weekdays' => $request->validated()['closed_weekdays']]);

        return response()->json($salon);
    }

    // 特定日の休業日を追加・削除
    public function toggle(StoreSalonClosureRequest $request)
    {
        $salonId = Auth::user()->salon_id;
        $date = Carbon::parse($request->date)->toDateString();
        $existing = SalonClosure::where('salon_id', $salonId)->where('date', $date)->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['action' => 'removed', 'date' => $date]);
        }

        $closure = SalonClosure::create([
            'salon_id' => $salonId,
            'date' => $date,
            'type' => $request->type,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'action' => 'added',
            'closure' => [
                'id' => $closure->id,
                'date' => $date,
                'type' => $closure->type,
                'reason' => $closure->reason,
            ],
        ]);
    }

    // 期間一括設定
    public function bulkSet(BulkSalonClosureRequest $request)
    {
        $validated = $request->validated();
        $salonId = Auth::user()->salon_id;
        $from = Carbon::parse($validated['date_from']);
        $to = Carbon::parse($validated['date_to']);

        if ($validated['action'] === 'remove') {
            SalonClosure::where('salon_id', $salonId)
                ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
                ->delete();
            return response()->json(['action' => 'removed']);
        }

        $current = $from->copy();
        while ($current->lte($to)) {
            SalonClosure::updateOrCreate(
                ['salon_id' => $salonId, 'date' => $current->toDateString()],
                ['type' => $validated['type'], 'reason' => $validated['reason'] ?? null]
            );
            $current->addDay();
        }

        return response()->json(['action' => 'added']);
    }
}
