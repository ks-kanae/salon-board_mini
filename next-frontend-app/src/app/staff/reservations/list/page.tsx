"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";

type Reservation = {
    id: number;
    start_at: string;
    end_at: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type: 'online' | 'manual' | 'next';
    is_nominated: boolean;
    notes: string | null;
    user: { id: number; name: string; phone: string | null };
    staff: { id: number; name: string } | null;
    menus: { id: number; name: string; pivot: { price_at_booking: number } }[];
    payment: { id: number;
        amount: number;
        discount: number;
        memo: string | null;
        method: string | null;
        paid_at: string | null;
        is_draft: boolean; } | null;
};

type Staff = { id: number; name: string };

const STATUS_LABEL: Record<string, string> = {
    pending: '仮予約', confirmed: '確定', cancelled: 'キャンセル', completed: '完了',
};
const TYPE_LABEL: Record<string, string> = {
    online: 'ネット', manual: '電話', next: '次回',
};

function ReservationListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const getJstDateString = () => {
        const d = new Date();
        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return jst.toISOString().split('T')[0];
    };

    const [dateFrom, setDateFrom] = useState(() => searchParams.get('date') ?? getJstDateString());
    const [dateTo, setDateTo] = useState(() => {
        const from = searchParams.get('date') ?? getJstDateString();
        return from;
    });
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedDetailReservation, setSelectedDetailReservation] = useState<Reservation | null>(null);
    const [selectedPaymentReservation, setSelectedPaymentReservation] = useState<Reservation | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [staffListForFilter, setStaffListForFilter] = useState<Staff[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchReservations = async (page = 1) => {
        setLoading(true);
        setSearched(true);
        try {
            const res = await api.get('/api/staff/reservations', {
                params: {
                    date_from: dateFrom,
                    date_to: dateTo,
                    status: statusFilter,
                    type: typeFilter,
                    staff_id: staffFilter,
                    customer_name: customerSearch,
                    paginate: true,
                    page,
                },
            });
            setReservations(res.data.data);
            setCurrentPage(res.data.current_page);
            setLastPage(res.data.last_page);
            setTotal(res.data.total);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchParams.get('date')) {
            fetchReservations();
        }
    }, []);

    useEffect(() => {
        api.get('/api/staff/members').then(res => setStaffListForFilter(res.data));
    }, []);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return `${jst.getUTCFullYear()}/${String(jst.getUTCMonth()+1).padStart(2,'0')}/${String(jst.getUTCDate()).padStart(2,'0')}`;
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    const totalAmount = reservations
        .filter(r => r.payment && !r.payment.is_draft)
        .reduce((sum, r) => sum + Math.max(0, r.payment!.amount - r.payment!.discount), 0);

    return (
        <StaffGuard>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">予約一覧</h1>
                    <Link
                        href="/staff/reservations"
                        className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
                    >
                        タイムテーブルで見る
                    </Link>
                </div>

                {/* 検索フォーム */}
                <div className="bg-white rounded-xl shadow p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">開始日</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">終了日</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                    </div>

                    {/* 顧客名検索 */}
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">顧客名</label>
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            placeholder="顧客名で絞り込み"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    <div className="flex gap-3">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="all">全ステータス</option>
                            <option value="confirmed">確定</option>
                            <option value="completed">完了</option>
                            <option value="cancelled">キャンセル</option>
                        </select>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="all">全種別</option>
                            <option value="online">ネット</option>
                            <option value="manual">電話</option>
                            <option value="next">次回</option>
                        </select>
                        <select
                            value={staffFilter}
                            onChange={e => setStaffFilter(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="all">全担当者</option>
                            {staffListForFilter.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={fetchReservations}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            検索
                        </button>
                    </div>
                </div>

                {/* 結果 */}

                {!searched ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
                        <p className="text-sm">日付を選択して検索してください</p>
                    </div>
                ) : loading ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center text-slate-500">読み込み中...</div>
                ) : reservations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center text-slate-500">
                        該当する予約がありません
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <p className="text-sm text-slate-500">{total}件の予約</p>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">会計済み合計</p>
                                <p className="font-bold text-slate-800">¥{totalAmount.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {reservations.map(r => {
                                const total =
                                r.payment && !r.payment.is_draft
                                ? r.payment.amount - r.payment.discount
                                : r.menus.reduce(
                                    (sum,m)=>sum+m.pivot.price_at_booking,
                                    0
                                );
                                const isCancelled = r.status === 'cancelled';
                                return (
                                    <div
                                        key={r.id}
                                        className={`px-6 py-4 ${isCancelled ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* 日時 */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link
                                                        href={`/staff/reservations?date=${r.start_at.slice(0,10)}&highlight=${r.id}`}
                                                        className="text-sm font-medium text-blue-600 hover:underline"
                                                    >
                                                        {formatDate(r.start_at)}　{formatTime(r.start_at)}〜{formatTime(r.end_at)}
                                                    </Link>
                                                </div>

                                                {/* 顧客名 */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link
                                                        href={`/staff/customers/${r.user.id}`}
                                                        className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                                                    >
                                                        {r.user.name}
                                                    </Link>
                                                    {r.user.phone && (
                                                        <a href={`tel:${r.user.phone}`} className="text-slate-400 text-xs hover:text-blue-600">
                                                            {r.user.phone}
                                                        </a>
                                                    )}
                                                </div>

                                                {/* メニュー */}
                                                <p className="text-slate-500 text-xs truncate">
                                                    {r.menus.map(m => m.name).join('・')}
                                                </p>

                                                {/* 担当 */}
                                                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                                                    担当：{r.staff?.name ?? '未定'}
                                                    {!!r.is_nominated && (
                                                        <span className="text-xs bg-blue-400 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* 右側 */}
                                            <div className="text-right shrink-0 space-y-1">
                                                <p className="font-bold text-slate-800">¥{total.toLocaleString()}</p>
                                                <div className="flex gap-1 justify-end flex-wrap">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        r.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                                                        r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                        r.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {STATUS_LABEL[r.status]}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        r.type === 'next' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {TYPE_LABEL[r.type]}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 pt-5 justify-end">
                                                    {r.status === 'confirmed' && (
                                                        <button
                                                            onClick={() => setSelectedDetailReservation(r)}
                                                            className="text-green-500 text-xs hover:underline"
                                                        >
                                                            予約詳細
                                                        </button>
                                                    )}
                                                    {r.payment && !r.payment.is_draft && (
                                                        <button
                                                            onClick={() => setSelectedPaymentReservation(r)}
                                                            className="text-blue-600 text-xs hover:underline"
                                                        >
                                                            会計詳細
                                                        </button>
                                                    )}
                                                    {r.status === 'confirmed' && !r.payment && (
                                                        <Link
                                                            href={`/staff/payments/${r.id}?from=${dateFrom}`}
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            会計する
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ページネーション */}
                {lastPage > 1 && (
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => fetchReservations(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50"
                        >
                            ← 前へ
                        </button>
                        <span className="px-4 py-2 text-sm text-slate-600">
                            {currentPage} / {lastPage}
                        </span>
                        <button
                            onClick={() => fetchReservations(currentPage + 1)}
                            disabled={currentPage === lastPage}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50"
                        >
                            次へ →
                        </button>
                    </div>
                )}


                {/* 予約詳細モーダル */}
                {selectedDetailReservation && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                        onClick={() => setSelectedDetailReservation(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-slate-800">予約詳細</h2>
                                <button onClick={() => setSelectedDetailReservation(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">予約日時</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDate(selectedDetailReservation.start_at)}　{formatTime(selectedDetailReservation.start_at)}〜{formatTime(selectedDetailReservation.end_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">お客様</span>
                                    <Link href={`/staff/customers/${selectedDetailReservation.user.id}`} className="font-medium text-blue-600 hover:underline">
                                        {selectedDetailReservation.user.name}
                                    </Link>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">担当</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-slate-800">{selectedDetailReservation.staff?.name ?? '不明'}</span>
                                        {!!selectedDetailReservation.is_nominated && (
                                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">種別</span>
                                    <span className="text-slate-800">{TYPE_LABEL[selectedDetailReservation.type]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ステータス</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        selectedDetailReservation.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                                        selectedDetailReservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-600'
                                    }`}>
                                        {STATUS_LABEL[selectedDetailReservation.status]}
                                    </span>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">施術メニュー</h3>
                                <div className="space-y-1">
                                    {selectedDetailReservation.menus.map(m => (
                                        <div key={m.id} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{m.name}</span>
                                            <span className="text-slate-800">¥{m.pivot.price_at_booking.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-bold border-t pt-2 mt-1">
                                        <span className="text-slate-700">合計</span>
                                        <span className="text-slate-800">¥{selectedDetailReservation.menus.reduce((sum, m) => sum + m.pivot.price_at_booking, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            {selectedDetailReservation.notes && (
                                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                                    <p className="text-slate-500 text-xs mb-1">備考</p>
                                    <p className="text-slate-800">{selectedDetailReservation.notes}</p>
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedDetailReservation(null)}
                                className="w-full py-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 text-sm"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                )}

                {/* 会計詳細モーダル */}
                {selectedPaymentReservation && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                        onClick={() => setSelectedPaymentReservation(null)}
                    >
                        <div
                            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-slate-800">会計詳細</h2>
                                <button onClick={() => setSelectedPaymentReservation(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">来店日時</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDate(selectedPaymentReservation.start_at)}　{formatTime(selectedPaymentReservation.start_at)}〜{formatTime(selectedPaymentReservation.end_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">お客様</span>
                                    <Link href={`/staff/customers/${selectedPaymentReservation.user.id}`} className="font-medium text-blue-600 hover:underline">
                                        {selectedPaymentReservation.user.name}
                                    </Link>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">担当</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-slate-800">{selectedPaymentReservation.staff?.name ?? '不明'}</span>
                                        {!!selectedPaymentReservation.is_nominated && (
                                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">施術メニュー</h3>
                                <div className="space-y-1">
                                    {selectedPaymentReservation.menus.map(m => (
                                        <div key={m.id} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{m.name}</span>
                                            <span className="text-slate-800">¥{m.pivot.price_at_booking.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selectedPaymentReservation.payment && (
                                <div className="border-t pt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">小計</span>
                                        <span className="text-slate-800">¥{selectedPaymentReservation.payment.amount.toLocaleString()}</span>
                                    </div>
                                    {selectedPaymentReservation.payment.discount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">割引</span>
                                            <span className="text-red-500">-¥{selectedPaymentReservation.payment.discount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold border-t pt-2">
                                        <span className="text-slate-700">請求金額</span>
                                        <span className="text-blue-600 text-base">
                                            ¥{Math.max(0, selectedPaymentReservation.payment.amount - selectedPaymentReservation.payment.discount).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">支払い方法</span>
                                        <span className="text-slate-800">
                                            {selectedPaymentReservation.payment.method === 'cash' ? '現金' :
                                            selectedPaymentReservation.payment.method === 'credit' ? 'クレジットカード' :
                                            selectedPaymentReservation.payment.method === 'cashless' ? 'キャッシュレス' : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">会計日時</span>
                                        <span className="text-slate-800">
                                            {selectedPaymentReservation.payment.paid_at
                                                ? new Date(selectedPaymentReservation.payment.paid_at).toLocaleString('ja-JP', {
                                                    timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })
                                                : '-'}
                                        </span>
                                    </div>
                                    {selectedPaymentReservation.payment.memo && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">メモ</span>
                                            <span className="text-slate-800 text-right max-w-[60%]">{selectedPaymentReservation.payment.memo}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedPaymentReservation(null)}
                                className="w-full mt-6 py-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 text-sm"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </StaffGuard>
    );
}

export default function ReservationListPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-slate-500">読み込み中...</div>}>
            <ReservationListContent />
        </Suspense>
    );
}
