<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Salon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SalonController extends Controller
{
    public function index()
    {
        return response()->json(
            Salon::where('is_active', true)->get()
        );
    }

    public function staff(Salon $salon)
    {
        return response()->json(
            \App\Models\User::where('role', 'staff')
                ->where('salon_id', $salon->id)
                ->get(['id', 'name'])
        );
    }

    // 指定日が定休日・予約停止かチェック
    public function checkClosure(Request $request, Salon $salon)
    {
        $request->validate(['date' => ['required', 'date']]);

        $date = \Carbon\Carbon::parse($request->date);

        // 定休曜日チェック
        $closedWeekdays = $salon->closed_weekdays ?? [];
        if (in_array($date->dayOfWeek, $closedWeekdays)) {
            return response()->json(['closed' => true, 'reason' => 'closed']);
        }

        // 特定日チェック
        $closure = \App\Models\SalonClosure::where('salon_id', $salon->id)
            ->where('date', $date->toDateString())
            ->first();

        if ($closure) {
            return response()->json(['closed' => true, 'reason' => $closure->type]);
        }

        return response()->json(['closed' => false, 'reason' => null]);
    }

    public function currentStaffSalon()
    {
        $salon = Salon::find(Auth::user()->salon_id);
        return response()->json($salon);
    }

    public function updateHours(Request $request)
    {
        $request->validate([
            'open_hour' => ['required', 'integer', 'between:0,23'],
            'close_hour' => ['required', 'integer', 'between:1,24'],
        ]);

        $salon = Salon::find(Auth::user()->salon_id);
        $salon->update([
            'open_hour' => $request->open_hour,
            'close_hour' => $request->close_hour,
        ]);

        return response()->json($salon);
    }
}
