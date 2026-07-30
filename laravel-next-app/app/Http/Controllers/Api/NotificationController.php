<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;


class NotificationController extends Controller
{
    // 未読通知一覧
    public function index()
    {
        return response()->json(
            Notification::with(['reservation.user', 'reservation.menus'])
                ->where('salon_id', Auth::user()->salon_id)
                ->where('is_read', false)
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    // 既読にする（削除ではなくis_read=trueに変更）
    public function markAsRead(Notification $notification)
    {
        $notification->update(['is_read' => true]);
        return response()->noContent();
    }

    // 全既読
    public function markAllAsRead()
    {
        Notification::where('salon_id', Auth::user()->salon_id)
            ->where('is_read', false)
            ->update(['is_read' => true]);
        return response()->noContent();
    }
}
