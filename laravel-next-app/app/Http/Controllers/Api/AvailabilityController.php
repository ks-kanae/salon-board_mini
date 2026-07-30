<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\GetAvailabilityRequest;
use App\Models\Reservation;
use App\Models\Salon;
use Carbon\Carbon;

class AvailabilityController extends Controller
{
    public function index(GetAvailabilityRequest $request)
    {
        $request->validated();
        $salon = Salon::findOrFail($request->salon_id);
        $date = Carbon::parse($request->date);
        $duration = (int) $request->duration;
        $menuIds = $request->menu_ids;

        // 営業時間はサロンのDBから取得
        $openHour = $salon->open_hour;
        $closeHour = $salon->close_hour;
        $interval = $salon->interval_minutes;

        $slots = [];
        $current = $date->copy()->setHour($openHour)->setMinute(0)->setSecond(0);
        $close = $date->copy()->setHour($closeHour)->setMinute(0)->setSecond(0);

        while ($current->copy()->addMinutes($duration)->lte($close)) {
            $slotStart = $current->copy();
            $slotEnd = $current->copy()->addMinutes($duration);

            // 過去の時間帯は×にする
            if ($slotEnd->isPast()) {
                $slots[] = [
                    'start_at' => $slotStart->toIso8601String(),
                    'end_at' => $slotEnd->toIso8601String(),
                    'available' => false,
                ];
                $current->addMinutes($interval);
                continue;
            }

            // 対応可能なスタッフが存在するか確認
            $availableStaff = Reservation::findAvailableStaff(
                salonId: $salon->id,
                menuIds: $menuIds,
                startAt: $slotStart->toDateTimeString(),
                endAt: $slotEnd->toDateTimeString(),
                date: $date->toDateString(),
            );

            $slots[] = [
                'start_at' => $slotStart->toIso8601String(),
                'end_at' => $slotEnd->toIso8601String(),
                'available' => $availableStaff !== null,
            ];

            $current->addMinutes($interval);
        }

        return response()->json($slots);
    }
}
