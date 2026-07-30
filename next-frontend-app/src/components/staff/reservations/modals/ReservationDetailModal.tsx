"use client";

import Link from "next/link";
import { StaffReservation } from "@/types/reservation";

const TYPE_LABEL: Record<StaffReservation['type'], string> = {
    online: 'ネット', manual: '電話', next: '次回',
};

type Props = {
    reservation: StaffReservation;
    date: string;
    closedDates: string[];
    onClose: () => void;
    onEdit: () => void;
    onCancel: () => void;
    getJstDateString: () => string;
    formatTime: (iso: string) => string;
};

export default function ReservationDetailModal({
    reservation, date, closedDates, onClose, onEdit, onCancel, getJstDateString, formatTime,
}: Props) {
    const resDate = new Date(reservation.start_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const isClosed = closedDates.includes(resDate);
    const isFuture = resDate > getJstDateString();
    const hasPayment = reservation.payment && !reservation.payment.is_draft;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Link href={`/staff/customers/${reservation.user.id}`} className="text-lg font-bold text-blue-600 hover:underline" onClick={onClose}>
                            {reservation.user.name}
                        </Link>
                        <p className="text-slate-500 text-sm">
                            {new Date(reservation.start_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' })}　
                            {formatTime(reservation.start_at)} 〜 {formatTime(reservation.end_at)}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>

                <div className="space-y-3 mb-4">
                    <div className="flex gap-2 flex-wrap items-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${reservation.payment ? 'bg-gray-400' : 'bg-yellow-400'} text-white`}>
                            {reservation.payment ? '会計済み' : '未会計'}
                        </span>
                        {!!reservation.is_nominated && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500 text-white">指名</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${reservation.type === 'next' ? 'bg-cyan-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {TYPE_LABEL[reservation.type]}
                        </span>
                    </div>

                    {reservation.user.phone && (
                        <div className="text-sm text-slate-600">
                            📞 <a href={`tel:${reservation.user.phone}`} className="text-blue-600 hover:underline">{reservation.user.phone}</a>
                        </div>
                    )}

                    <div className="border-t pt-3">
                        {reservation.menus.map(m => (
                            <div key={m.id} className="flex justify-between text-sm text-slate-600 mb-1">
                                <span>{m.name}</span>
                                <span>¥{m.pivot.price_at_booking.toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between font-bold text-slate-800 mt-2 pt-2 border-t">
                            <span>合計</span>
                            <span>¥{reservation.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {reservation.notes && (
                        <p className="text-slate-500 text-sm bg-slate-50 p-2 rounded">備考：{reservation.notes}</p>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap">
                    {reservation.status !== 'cancelled' && !isFuture && (
                        <Link href={`/staff/payments/${reservation.id}?from=${date}`} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm text-center hover:bg-blue-700 transition-colors" onClick={onClose}>
                            {isClosed && !hasPayment ? '会計する' : isClosed && hasPayment ? '会計を確認する' : hasPayment ? '会計を修正する' : '会計する'}
                        </Link>
                    )}
                    {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
                        <>
                            <button onClick={onEdit} className="flex-1 border border-blue-300 text-blue-600 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">変更する</button>
                            <button onClick={onCancel} className="flex-1 border border-red-300 text-red-500 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">予約キャンセル</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
