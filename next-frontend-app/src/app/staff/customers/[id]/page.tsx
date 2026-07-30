"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";
import Toast from "@/components/Toast";


type Reservation = {
    id: number;
    start_at: string;
    end_at: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type: 'online' | 'manual' | 'next';
    notes: string | null;
    menus: { id: number; name: string; pivot: { price_at_booking: number } }[];
    staff: { id: number; name: string } | null;
    payment: { id: number; amount: number; discount: number; method: string | null; paid_at: string | null; is_draft: boolean } | null;
    is_nominated: boolean | number;
};

type Customer = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    memo: string | null;
    visit_count: number;
    last_visited_at: string | null;
    reservations: Reservation[];
};

const STATUS_LABEL: Record<string, string> = {
    pending: '仮予約', confirmed: '確定', cancelled: 'キャンセル', completed: '完了',
};
const TYPE_LABEL: Record<string, string> = {
    online: 'ネット', manual: '電話', next: '次回',
};

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'history' | 'cancelled'>('history');
    const [selectedPaymentReservation, setSelectedPaymentReservation] = useState<Reservation | null>(null);
    const [selectedDetailReservation, setSelectedDetailReservation] = useState<Reservation | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 編集モード
    const [editing, setEditing] = useState(false);
    const [editValues, setEditValues] = useState({ name: '', phone: '', address: '', memo: '' });
    const [saving, setSaving] = useState(false);

    // 顧客詳細（フォーカスが戻った時に再取得）
    const fetchCustomer = async () => {
        const res = await api.get(`/api/staff/customers/${customerId}`);
        setCustomer(res.data);
        setEditValues({
            name:    res.data.name ?? '',
            phone:   res.data.phone ?? '',
            address: res.data.address ?? '',
            memo:    res.data.memo ?? '',
        });
    };

    useEffect(() => {
        setLoading(true);
        fetchCustomer().finally(() => setLoading(false));

        // ページに戻った時に再取得
        const handleFocus = () => fetchCustomer();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [customerId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.patch(`/api/staff/customers/${customerId}`, editValues);
            setCustomer(prev => prev ? { ...prev, ...res.data } : prev);
            setEditing(false);
        } catch {
            setErrorMessage('更新に失敗しました。');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (iso: string) =>
        iso.slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) =>
            `${y}年${parseInt(m)}月${parseInt(d)}日`
        );

    const formatTime = (iso: string) => {
        const d = new Date(iso);

        return d.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Tokyo",
        });
    };

    if (loading) return <StaffGuard><div className="flex justify-center items-center min-h-64 text-slate-500">読み込み中...</div></StaffGuard>;
    if (!customer) return <StaffGuard><div className="text-center py-16 text-slate-500">顧客が見つかりません</div></StaffGuard>;

    const filteredReservations = customer.reservations.filter(r => {
        if (filter === 'history')   return r.status !== 'cancelled';
        if (filter === 'cancelled') return r.status === 'cancelled' && r.type === 'online';
        return true;
    });

    const totalSpent = customer.reservations
        .filter(r => r.payment && !r.payment.is_draft)
        .reduce((sum, r) => sum + Math.max(0, (r.payment!.amount - r.payment!.discount)), 0);

    return (
        <StaffGuard>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">← 戻る</button>
                        <h1 className="text-2xl font-bold text-slate-800">顧客詳細</h1>
                    </div>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
                        >
                            編集する
                        </button>
                    )}
                </div>

                {/* 顧客情報 */}
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold text-xl">
                                {(editing ? editValues.name : customer.name).charAt(0)}
                            </span>
                        </div>
                        <div className="flex-1">
                            {editing ? (
                                <input
                                    type="text"
                                    value={editValues.name}
                                    onChange={e => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                                    className="text-xl font-bold text-slate-800 border-b-2 border-blue-400 w-full focus:outline-none"
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-slate-800">{customer.name}</h2>
                            )}
                            <p className="text-slate-500 text-sm">{customer.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* 電話番号 */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs mb-1">電話番号</p>
                            {editing ? (
                                <input
                                    type="tel"
                                    value={editValues.phone}
                                    onChange={e => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="090-0000-0000"
                                    className="w-full bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-400 text-sm"
                                />
                            ) : (
                                <p className="font-medium text-slate-800">
                                    {customer.phone
                                        ? <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
                                        : '未登録'}
                                </p>
                            )}
                        </div>

                        {/* 来店回数 */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs mb-1">来店回数</p>
                            <p className="font-bold text-slate-800 text-lg">{customer.visit_count}回</p>
                        </div>

                        {/* 最終来店日 */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs mb-1">最終来店日</p>
                            <p className="font-medium text-slate-800">
                                {customer.last_visited_at ? formatDate(customer.last_visited_at) : '-'}
                            </p>
                        </div>

                        {/* 累計利用金額 */}
                        <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-slate-500 text-xs mb-1">累計利用金額</p>
                            <p className="font-bold text-slate-800">¥{totalSpent.toLocaleString()}</p>
                        </div>

                        {/* 住所 */}
                        <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                            <p className="text-slate-500 text-xs mb-1">住所</p>
                            {editing ? (
                                <input
                                    type="text"
                                    value={editValues.address}
                                    onChange={e => setEditValues(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="東京都渋谷区..."
                                    className="w-full bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-400 text-sm"
                                />
                            ) : (
                                <p className="font-medium text-slate-800">{customer.address || '未登録'}</p>
                            )}
                        </div>

                        {/* メモ */}
                        <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                            <p className="text-slate-500 text-xs mb-1">メモ</p>
                            {editing ? (
                                <textarea
                                    value={editValues.memo}
                                    onChange={e => setEditValues(prev => ({ ...prev, memo: e.target.value }))}
                                    placeholder="アレルギー、好みなど"
                                    rows={3}
                                    className="w-full bg-transparent border border-slate-300 rounded p-2 focus:outline-none focus:border-blue-400 text-sm resize-none"
                                />
                            ) : (
                                <p className="text-slate-800 text-sm whitespace-pre-wrap">{customer.memo || '未登録'}</p>
                            )}
                        </div>
                    </div>

                    {/* 編集時のボタン */}
                    {editing && (
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setEditValues({
                                        name:    customer.name ?? '',
                                        phone:   customer.phone ?? '',
                                        address: customer.address ?? '',
                                        memo:    customer.memo ?? '',
                                    });
                                }}
                                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!editValues.name || saving}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '保存する'}
                            </button>
                        </div>
                    )}
                </div>

                {errorMessage && (
                    <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
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
                                <button
                                    onClick={() => setSelectedPaymentReservation(null)}
                                    className="text-slate-400 hover:text-slate-600 text-xl"
                                >✕</button>
                            </div>

                            {/* 来店情報 */}
                            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">来店日時</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDate(selectedPaymentReservation.start_at)}　{formatTime(selectedPaymentReservation.start_at)}〜{formatTime(selectedPaymentReservation.end_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">担当</span>
                                    <div className="flex items-center gap-1">
                                        {!!selectedPaymentReservation.is_nominated && (
                                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                        )}
                                        <span className="font-medium text-slate-800">
                                            {selectedPaymentReservation.staff?.name ?? '不明'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">予約種別</span>
                                    <span className="text-slate-800">{TYPE_LABEL[selectedPaymentReservation.type]}</span>
                                </div>
                            </div>

                            {/* メニュー明細 */}
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

                            {/* 会計情報 */}
                            {selectedPaymentReservation.payment && !selectedPaymentReservation.payment.is_draft && (
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
                                                    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
                                className="w-full mt-6 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors text-sm"
                            >
                                閉じる
                            </button>
                        </div>
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
                                <button
                                    onClick={() => setSelectedDetailReservation(null)}
                                    className="text-slate-400 hover:text-slate-600 text-xl"
                                >✕</button>
                            </div>

                            {/* 予約情報 */}
                            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">予約日時</span>
                                    <span className="font-medium text-slate-800">
                                        {formatDate(selectedDetailReservation.start_at)}　{formatTime(selectedDetailReservation.start_at)}〜{formatTime(selectedDetailReservation.end_at)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">担当</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-slate-800">
                                            {selectedDetailReservation.staff?.name ?? '不明'}
                                        </span>
                                        {!!selectedDetailReservation.is_nominated && (
                                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">予約種別</span>
                                    <span className="text-slate-800">{TYPE_LABEL[selectedDetailReservation.type]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ステータス</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        selectedDetailReservation.status === 'completed'  ? 'bg-blue-100 text-blue-600' :
                                        selectedDetailReservation.status === 'confirmed'  ? 'bg-green-100 text-green-700' :
                                        selectedDetailReservation.status === 'cancelled'  ? 'bg-red-100 text-red-600' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {selectedDetailReservation.status === 'completed' ? '来店済み' :
                                        selectedDetailReservation.status === 'confirmed' ? '予約中' :
                                        selectedDetailReservation.status === 'cancelled' ? 'キャンセル' : '仮予約'}
                                    </span>
                                </div>
                            </div>

                            {/* メニュー明細 */}
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
                                        <span className="text-slate-800">
                                            ¥{selectedDetailReservation.menus.reduce((sum, m) => sum + m.pivot.price_at_booking, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 備考 */}
                            {selectedDetailReservation.notes && (
                                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                                    <p className="text-slate-500 text-xs mb-1">備考</p>
                                    <p className="text-slate-800">{selectedDetailReservation.notes}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedDetailReservation(null)}
                                className="w-full py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600 transition-colors text-sm"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                )}

                {/* 予約履歴 */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">予約履歴（{customer.reservations.length}件）</h2>
                        <div className="flex gap-1">
                            {([
                                { key: 'history',   label: '来店履歴' },
                                { key: 'cancelled', label: 'キャンセル' },
                            ] as const).map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`px-3 py-1 rounded text-xs transition-colors ${
                                        filter === f.key ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {filteredReservations.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">該当する予約がありません</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredReservations.map(r => {
                                const total =
                                r.payment && !r.payment.is_draft
                                ? r.payment.amount - r.payment.discount
                                : r.menus.reduce(
                                    (sum,m)=>sum+m.pivot.price_at_booking,
                                    0
                                );
                                const isCancelled = r.status === 'cancelled';
                                return (
                                    <div key={r.id} className={`px-6 py-4 ${isCancelled ? 'opacity-50' : ''}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                {r.status === 'confirmed' ? (
                                                    <Link
                                                        href={`/staff/reservations?date=${r.start_at.slice(0, 10)}`}
                                                        className="font-medium text-blue-600 hover:underline text-sm"
                                                    >
                                                        {formatDate(r.start_at)}　{formatTime(r.start_at)}〜{formatTime(r.end_at)}
                                                    </Link>
                                                ) : (
                                                    <p className="font-medium text-slate-800 text-sm">
                                                        {formatDate(r.start_at)}　{formatTime(r.start_at)}〜{formatTime(r.end_at)}
                                                    </p>
                                                )}
                                                <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                                                    担当：{r.staff?.name ?? '不明'}
                                                    {!!r.is_nominated && (
                                                        <span className="text-xs bg-blue-400 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    r.status === 'completed'  ? 'bg-blue-100 text-blue-600' :
                                                    r.status === 'confirmed'  ? 'bg-green-100 text-green-700' :
                                                    r.status === 'cancelled'  ? 'bg-red-100 text-red-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {r.status === 'completed' ? '来店済み' :
                                                    r.status === 'confirmed' ? '予約中' :
                                                    r.status === 'cancelled' ? 'キャンセル' : '仮予約'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="text-slate-500 text-xs">
                                                {r.menus.map(m => m.name).join('・')}
                                            </p>
                                            <div className="text-right">
                                                <div className="flex gap-5 justify-end">
                                                    {r.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => setSelectedDetailReservation(r)}
                                                        className="text-green-500 text-xs hover:underline"
                                                    >
                                                        予約詳細
                                                        </button>
                                                    )}
                                                    <p className="font-bold text-slate-800 text-sm">¥{total.toLocaleString()}</p>
                                                </div>
                                                {r.payment && !r.payment.is_draft && (
                                                    <p className="text-slate-400 text-xs">
                                                        <button
                                                            onClick={() => setSelectedPaymentReservation(r)}
                                                            className="text-blue-600 pr-5 text-xs hover:underline"
                                                        >
                                                            会計詳細
                                                        </button>
                                                        {r.payment.method === 'cash' ? '現金' :
                                                        r.payment.method === 'credit' ? 'クレジット' :
                                                        r.payment.method === 'cashless' ? 'キャッシュレス' : ''}　会計済み
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {r.notes && (
                                            <p className="text-slate-400 text-xs mt-1 bg-slate-50 px-2 py-1 rounded">
                                                備考：{r.notes}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 新規予約ボタン */}
                <div className="pb-8">
                    <Link
                        href={`/staff/reservations/new?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}&customer_phone=${encodeURIComponent(customer.phone ?? '')}`}
                        className="w-full block text-center py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                        新規予約を追加
                    </Link>
                </div>
            </div>
        </StaffGuard>
    );
}
