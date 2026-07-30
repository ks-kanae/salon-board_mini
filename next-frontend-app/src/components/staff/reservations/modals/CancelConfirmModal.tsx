"use client";

import { StaffReservation } from "@/types/reservation";

type Props = {
    reservation: StaffReservation;
    onClose: () => void;
    onConfirm: () => void;
    formatTime: (iso: string) => string;
};

export default function CancelConfirmModal({ reservation, onClose, onConfirm, formatTime }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-slate-800 mb-2">予約をキャンセルしますか？</h2>
                <p className="text-slate-600 text-sm mb-1">{reservation.user.name}さん</p>
                <p className="text-slate-500 text-sm mb-6">
                    {new Date(reservation.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    〜 {new Date(reservation.end_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">戻る</button>
                    <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">キャンセルする</button>
                </div>
            </div>
        </div>
    );
}
