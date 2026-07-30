<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerController extends Controller
{
    // 顧客一覧・検索
    public function index(Request $request)
    {
        $salonId = Auth::user()->salon_id;

        $query = User::where('role', 'customer')
            ->whereHas('reservations', function ($q) use ($salonId) {
                $q->where('salon_id', $salonId);
            })
            ->withCount([
                'reservations as visit_count' => function ($q) use ($salonId) {
                    $q->where('salon_id', $salonId)
                        ->whereHas('payment', function ($payment) {
                            $payment->where('is_draft', false);
                        });
                }
            ])
            ->with([
                'reservations' => function ($q) use ($salonId) {
                    $q->where('salon_id', $salonId)
                        ->where('status', 'completed')
                        ->orderBy('start_at', 'desc')
                        ->limit(1);
                }
            ]);

        // 名前・電話番号で検索
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('name')->paginate(20);

        return response()->json($customers);
    }

    // 顧客詳細
    public function show(User $user)
    {
        $salonId = Auth::user()->salon_id;

        $visitCount = $user->reservations()
            ->where('salon_id', $salonId)
            ->whereHas('payment', function ($q) {
                $q->where('is_draft', false);
            })
            ->count();

        $reservations = $user->reservations()
            ->where('salon_id', $salonId)
            ->with(['menus', 'staff', 'payment'])
            ->orderBy('start_at', 'desc')
            ->get();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'memo' => $user->memo,
            'visit_count' => $visitCount,
            'last_visited_at' => $user->last_visited_at,
            'reservations' => $reservations,
        ]);
    }

    // 顧客情報更新
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:255'],
            'memo' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->update($validated);

        return response()->json($user);
    }
}
