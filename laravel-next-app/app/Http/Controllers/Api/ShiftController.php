<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    // 指定月のシフト一覧（スタッフ全員分）
    public function index(Request $request)
    {
        $request->validate([
            'month' => ['required', 'date'],
        ]);

        $salonId = Auth::user()->salon_id;
        $month = Carbon::parse($request->month);

        $staffList = User::where('role', 'staff')
            ->where('salon_id', $salonId)
            ->get(['id', 'name']);

        $shifts = Shift::where('salon_id', $salonId)
            ->whereYear('date', $month->year)
            ->whereMonth('date', $month->month)
            ->get();

        // スタッフごと・日付ごとのシフトマップを返す
        // {staff_id: {date: is_working}}
        $shiftMap = [];
        foreach ($shifts as $shift) {
            $shiftMap[$shift->user_id][$shift->date->format('Y-m-d')] = $shift->is_working;
        }

        return response()->json([
            'staff' => $staffList,
            'shift_map' => $shiftMap,
            'month' => $month->format('Y-m'),
        ]);
    }

    // シフトの更新（1日1スタッフ分）
    public function upsert(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'date' => ['required', 'date'],
            'is_working' => ['required', 'boolean'],
        ]);

        $salonId = Auth::user()->salon_id;

        $shift = Shift::updateOrCreate(
            [
                'user_id' => $request->user_id,
                'date' => $request->date,
            ],
            [
                'salon_id' => $salonId,
                'is_working' => $request->is_working,
            ]
        );

        return response()->json($shift);
    }
}
