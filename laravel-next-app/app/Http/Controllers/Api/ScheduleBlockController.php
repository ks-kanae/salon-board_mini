<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreScheduleBlockRequest;
use App\Models\ScheduleBlock;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScheduleBlockController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['date' => ['required', 'date']]);
        $salonId = Auth::user()->salon_id;

        $blocks = ScheduleBlock::where('salon_id', $salonId)
            ->whereDate('start_at', Carbon::parse($request->date))
            ->with('staff')
            ->get();

        return response()->json($blocks);
    }

    public function store(StoreScheduleBlockRequest $request)
    {
        $validated = $request->validated();
        $salonId = Auth::user()->salon_id;
        $startAt = Carbon::parse($validated['start_at']);
        $endAt = Carbon::parse($validated['end_at']);
        $staffId = $validated['staff_id'];

        // 予定同士の重複チェック
        $blockConflict = ScheduleBlock::where('salon_id', $salonId)
            ->where('staff_id', $staffId)
            ->where(function ($q) use ($startAt, $endAt) {
                $q->where('start_at', '<', $endAt)
                    ->where('end_at', '>', $startAt);
            })
            ->exists();

        if ($blockConflict) {
            return response()->json(['message' => 'この時間帯にはすでに予定が入っています。'], 409);
        }

        // 予約との重複チェック
        $reservationConflict = \App\Models\Reservation::where('salon_id', $salonId)
            ->where('staff_id', $staffId)
            ->whereNotIn('status', ['cancelled'])
            ->where(function ($q) use ($startAt, $endAt) {
                $q->where('start_at', '<', $endAt)
                    ->where('end_at', '>', $startAt);
            })
            ->exists();

        if ($reservationConflict) {
            return response()->json(['message' => 'この時間帯には予約が入っています。'], 409);
        }

        $block = ScheduleBlock::create([
            'salon_id' => $salonId,
            'staff_id' => $staffId,
            'title' => $validated['title'] ?? '予定',
            'start_at' => $startAt,
            'end_at' => $endAt,
        ]);

        return response()->json($block->load('staff'), 201);
    }

    public function update(Request $request, ScheduleBlock $scheduleBlock)
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'start_at' => ['sometimes', 'date'],
            'end_at' => ['sometimes', 'date', 'after:start_at'],
            'staff_id' => ['sometimes', 'exists:users,id'],
        ]);

        $staffId = $validated['staff_id'] ?? $scheduleBlock->staff_id;

        if (isset($validated['start_at']) && isset($validated['end_at'])) {
            $startAt = Carbon::parse($validated['start_at']);
            $endAt = Carbon::parse($validated['end_at']);

            // 自分以外の予定との重複チェック
            $blockConflict = ScheduleBlock::where('salon_id', $scheduleBlock->salon_id)
                ->where('staff_id', $staffId)
                ->where('id', '!=', $scheduleBlock->id)
                ->where(function ($q) use ($startAt, $endAt) {
                    $q->where('start_at', '<', $endAt)
                        ->where('end_at', '>', $startAt);
                })
                ->exists();

            if ($blockConflict) {
                return response()->json(['message' => 'この時間帯にはすでに予定が入っています。'], 409);
            }

            // 予約との重複チェック
            $reservationConflict = \App\Models\Reservation::where('salon_id', $scheduleBlock->salon_id)
                ->where('staff_id', $staffId)
                ->whereNotIn('status', ['cancelled'])
                ->where(function ($q) use ($startAt, $endAt) {
                    $q->where('start_at', '<', $endAt)
                        ->where('end_at', '>', $startAt);
                })
                ->exists();

            if ($reservationConflict) {
                return response()->json(['message' => 'この時間帯には予約が入っています。'], 409);
            }
        }

        $scheduleBlock->update([
            'title' => $validated['title'] ?? $scheduleBlock->title,
            'start_at' => isset($validated['start_at']) ? Carbon::parse($validated['start_at']) : $scheduleBlock->start_at,
            'end_at' => isset($validated['end_at']) ? Carbon::parse($validated['end_at']) : $scheduleBlock->end_at,
            'staff_id' => $staffId,
        ]);

        return response()->json($scheduleBlock->fresh()->load('staff'));
    }

    public function destroy(ScheduleBlock $scheduleBlock)
    {
        $scheduleBlock->delete();
        return response()->json(['message' => '削除しました']);
    }
}
