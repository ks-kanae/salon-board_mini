"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";

type Menu = {
    id: number;
    name: string;
    pivot: { price_at_booking: number };
};

type Payment = {
    id: number;
    amount: number;
    discount: number;
    memo: string | null;
    method: 'cash' | 'credit' | 'cashless' | null;
    is_draft: boolean;
    paid_at: string | null;
};

type Reservation = {
    id: number;
    start_at: string;
    end_at: string;
    notes: string | null;
    is_nominated: boolean | number;
    staff: { id: number; name: string } | null;
    user: { id: number; name: string; phone: string | null };
    menus: Menu[];
    payment: Payment | null;
};

const METHOD_LABEL: Record<string, string> = {
    cash: '現金',
    credit: 'クレジットカード',
    cashless: 'キャッシュレス',
};

function PaymentContent() {
    const params = useParams();
    const router = useRouter();
    const reservationId = params.id as string;

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // 会計入力値
    const [amount, setAmount] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [memo, setMemo] = useState("");
    const [menuPrices, setMenuPrices] = useState<Record<number, number>>({});
    const [method, setMethod] = useState<'cash' | 'credit' | 'cashless'>('cash');
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [isClosed, setIsClosed] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showMenuEdit, setShowMenuEdit] = useState(false);
    const [allMenus, setAllMenus] = useState<{id: number; name: string; price: number; duration_minutes: number}[]>([]);
    const [editMenuIds, setEditMenuIds] = useState<number[]>([]);
    const [savingMenus, setSavingMenus] = useState(false);
    const searchParams = useSearchParams();
    const fromDate = searchParams.get('from');
    const [isNominated, setIsNominated] = useState(false);
    const [staffList, setStaffList] = useState<{id: number; name: string}[]>([]);
    const [staffId, setStaffId] = useState<number | null>(null);
    const [showSavedModal, setShowSavedModal] = useState(false);

    // useEffect内のレジ締めチェックを削除して、APIのレスポンスから取得
    useEffect(() => {
        api.get(`/api/staff/reservations/${reservationId}/payment`)
            .then(res => {
                const r = res.data;
                setReservation(r);
                setIsClosed(r.is_closing_locked ?? false);
                setIsNominated(r.is_nominated ?? false);
                setStaffId(r.staff?.id ?? null);
                api.get('/api/staff/members').then(res => setStaffList(res.data));

                const initialPrices: Record<number, number> = {};
                r.menus.forEach((m: Menu) => {
                    initialPrices[m.id] = m.pivot.price_at_booking;
                });
                setMenuPrices(initialPrices);

                if (r.payment) {
                    setAmount(r.payment.amount);
                    setDiscount(r.payment.discount ?? 0);
                    setMemo(r.payment.memo ?? "");
                    if (r.payment.method) setMethod(r.payment.method);
                } else {
                    const total = r.menus.reduce((sum: number, m: Menu) => sum + m.pivot.price_at_booking, 0);
                    setAmount(total);
                }
            })
            .finally(() => setLoading(false));
    }, [reservationId]);

    const menuTotal = reservation?.menus.reduce(
        (sum, m) => sum + (menuPrices[m.id] ?? m.pivot.price_at_booking), 0
    ) ?? 0;

    const finalAmount = Math.max(0, amount - discount);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', {
            month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',hour12: false,timeZone:'Asia/Tokyo'
        });
    };

    // 一時保存
    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            await api.post(`/api/staff/reservations/${reservationId}/payment/draft`, {
                amount, discount, memo,
            });
            await api.patch(`/api/staff/reservations/${reservationId}`, {
                is_nominated: isNominated,
            });
            setShowSavedModal(true);
        } finally {
            setSaving(false);
        }
    };

    // 会計確定
    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await api.post(`/api/staff/reservations/${reservationId}/payment/confirm`, {
                amount,
                discount,
                memo,
                method,
            });
            setShowConfirmModal(false);
            router.push('/staff/reservations');
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || '会計確定に失敗しました。');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <StaffGuard>
                <div className="flex justify-center items-center min-h-64">
                    <p className="text-slate-500">読み込み中...</p>
                </div>
            </StaffGuard>
        );
    }

    if (!reservation) {
        return (
            <StaffGuard>
                <div className="text-center py-16 text-slate-500">予約が見つかりません</div>
            </StaffGuard>
        );
    }

    const isConfirmed = isClosed;

    // 会計取消
    const handleCancelPayment = async () => {
        setCancelling(true);
        try {
            await api.delete(`/api/staff/reservations/${reservationId}/payment`);
            router.push('/staff/reservations');
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || '会計取消しに失敗しました。');
        } finally {
            setCancelling(false);
            setCancelTarget(false);
        }
    };

    return (
        <StaffGuard>

            {errorMessage && (
                <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}

            {/* 会計確定確認モーダル */}
            {showConfirmModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setShowConfirmModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-slate-800 mb-2">会計を確定しますか？</h2>
                        <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">小計</span>
                                <span className="text-slate-800">¥{amount.toLocaleString()}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">割引</span>
                                    <span className="text-red-500">-¥{discount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold border-t pt-2">
                                <span className="text-slate-800">請求金額</span>
                                <span className="text-blue-600 text-lg">¥{finalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">支払い方法</span>
                                <span className="text-slate-800">{METHOD_LABEL[method]}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirming}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {confirming ? '処理中...' : '確定する'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 会計内容保存モーダル */}
            {showSavedModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setShowSavedModal(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-5xl text-blue-400 mb-3">✔︎</div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">会計内容を保存しました</h2>
                        <p className="text-slate-500 text-sm mb-6">会計を確定する場合は「会計を確定する」を押してください。</p>
                        <button
                            onClick={() => setShowSavedModal(false)}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* メニュー変更モーダル */}
            {showMenuEdit && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setShowMenuEdit(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">メニューを変更</h2>
                            <button onClick={() => setShowMenuEdit(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>
                        <div className="space-y-2 mb-6">
                            {allMenus.map(menu => {
                                const selected = editMenuIds.includes(menu.id);
                                return (
                                    <button
                                        key={menu.id}
                                        type="button"
                                        onClick={() => setEditMenuIds(prev =>
                                            prev.includes(menu.id)
                                                ? prev.filter(id => id !== menu.id)
                                                : [...prev, menu.id]
                                        )}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                            selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{menu.name}</p>
                                                {menu.duration_minutes > 0 && <p className="text-xs text-slate-400">{menu.duration_minutes}分</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-800">¥{menu.price.toLocaleString()}</p>
                                                {selected && <span className="text-blue-500 text-xs">✓</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowMenuEdit(false)}
                                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                キャンセル
                            </button>
                            <button
                                disabled={editMenuIds.length === 0 || savingMenus}
                                onClick={async () => {
                                    setSavingMenus(true);
                                    try {
                                        const res = await api.put(
                                            `/api/staff/reservations/${reservationId}/menus`,
                                            { menu_ids: editMenuIds }
                                        );
                                        // メニュー更新後にreservationを再取得
                                        const updated = await api.get(`/api/staff/reservations/${reservationId}/payment`);
                                        setReservation(updated.data);
                                        // menuPricesを再初期化
                                        const newPrices: Record<number, number> = {};
                                        updated.data.menus.forEach((m: Menu) => {
                                            newPrices[m.id] = m.pivot.price_at_booking;
                                        });
                                        setMenuPrices(newPrices);
                                        setAmount(updated.data.menus.reduce((sum: number, m: Menu) => sum + m.pivot.price_at_booking, 0));
                                        setShowMenuEdit(false);
                                    } catch {
                                        setErrorMessage('メニューの変更に失敗しました。');
                                    } finally {
                                        setSavingMenus(false);
                                    }
                                }}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {savingMenus ? '保存中...' : '変更を保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 会計取消し確認モーダル */}
            {cancelTarget && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setCancelTarget(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-slate-800 mb-2">会計を取消しますか？</h2>
                        <p className="text-slate-500 text-sm mb-6">
                            会計情報が削除されます。予約ステータスは「確定」に戻ります。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCancelTarget(false)}
                                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleCancelPayment}
                                disabled={cancelling}
                                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                            >
                                {cancelling ? '処理中...' : '取消す'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto space-y-6">
                {/* ヘッダー */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const target = fromDate
                                ? `/staff/reservations?date=${fromDate}&refresh=${Date.now()}`
                                : `/staff/reservations?refresh=${Date.now()}`;
                            router.push(target);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                        ← 戻る
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">会計</h1>
                    {reservation.payment && !reservation.payment.is_draft && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                            会計済み
                        </span>
                    )}
                    {isClosed && (
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium ml-1">
                            レジ締め済み
                        </span>
                    )}
                </div>

                {/* 予約情報 */}
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-bold text-slate-700 mb-3">予約情報</h2>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">お客様</span>
                            <span className="font-medium text-slate-800">{reservation.user.name}</span>
                        </div>
                        {reservation.user.phone && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">電話番号</span>
                                <a href={`tel:${reservation.user.phone}`} className="text-blue-600 hover:underline">
                                    {reservation.user.phone}
                                </a>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-slate-500">予約日時</span>
                            <span className="text-slate-800">{formatTime(reservation.start_at)}</span>
                        </div>
                    </div>
                </div>

                {/* 担当スタッフ・指名 */}
                <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center gap-5 text-sm">
                        <span className="text-slate-700 text-base font-bold mr-10 shrink-0">担当・指名</span>
                        {!isConfirmed ? (
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isNominated}
                                        onChange={async (e) => {
                                            setIsNominated(e.target.checked);
                                            await api.patch(`/api/staff/reservations/${reservationId}`, {
                                                is_nominated: e.target.checked,
                                            });
                                        }}
                                        className="w-4 h-4 rounded accent-blue-600"
                                    />
                                    <span className="text-slate-600">指名</span>
                                </label>
                                <select
                                    value={staffId ?? ''}
                                    onChange={async (e) => {
                                        const newStaffId = Number(e.target.value);
                                        setStaffId(newStaffId);
                                        await api.patch(`/api/staff/reservations/${reservationId}`, {
                                            staff_id: newStaffId,
                                        });
                                    }}
                                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-800">
                                    {staffList.find(s => s.id === staffId)?.name ?? reservation.staff?.name ?? '未定'}
                                </span>
                                {isNominated && (
                                    <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">指名</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* メニュー */}
                <div className="bg-white rounded-xl shadow p-5">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-slate-700">施術メニュー</h2>
                        {!isConfirmed && (
                            <button
                                onClick={() => {
                                    setEditMenuIds(reservation.menus.map(m => m.id));
                                    api.get('/api/staff/menus').then(res => setAllMenus(res.data));
                                    setShowMenuEdit(true);
                                }}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                メニューを変更する
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {reservation.menus.map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-3">
                                <span className="text-slate-600 text-sm flex-1">{m.name}</span>
                                {isConfirmed ? (
                                    <span className="text-slate-800 text-sm font-medium">
                                        ¥{(menuPrices[m.id] ?? m.pivot.price_at_booking).toLocaleString()}
                                    </span>
                                ) : (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-slate-400 text-sm">¥</span>
                                        <input
                                            type="number"
                                            value={menuPrices[m.id] ?? m.pivot.price_at_booking}
                                            onChange={e => {
                                                const newPrice = Number(e.target.value);
                                                setMenuPrices(prev => ({ ...prev, [m.id]: newPrice }));
                                                // メニューの合計を自動的にamountに反映
                                                const newTotal = reservation.menus.reduce(
                                                    (sum, menu) => sum + (menu.id === m.id ? newPrice : (menuPrices[menu.id] ?? menu.pivot.price_at_booking)),
                                                    0
                                                );
                                                setAmount(newTotal);
                                            }}
                                            className="w-28 border border-slate-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            min={0}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-2 mt-2">
                            <span className="text-slate-700">メニュー合計</span>
                            <span className="text-slate-800">¥{menuTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 金額調整 */}
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="font-bold text-slate-700 mb-4">金額調整</h2>
                    <div className="space-y-4">
                        {/* 請求金額（直接入力） */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                請求金額（直接入力）
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">¥</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(Number(e.target.value))}
                                    disabled={isConfirmed ?? false}
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                                    min={0}
                                />
                            </div>
                            <button
                                onClick={() => setAmount(menuTotal)}
                                disabled={isConfirmed ?? false}
                                className="mt-1 text-xs text-blue-600 hover:underline disabled:text-slate-400"
                            >
                                メニュー合計（¥{menuTotal.toLocaleString()}）に戻す
                            </button>
                        </div>

                        {/* 割引額 */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                割引額
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">-¥</span>
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={e => setDiscount(Number(e.target.value))}
                                    disabled={isConfirmed ?? false}
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                                    min={0}
                                />
                            </div>
                        </div>

                        {/* メモ */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                メモ（任意）
                            </label>
                            <input
                                type="text"
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                                disabled={isConfirmed ?? false}
                                placeholder="割引理由など"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                        </div>

                        {/* 請求金額プレビュー */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">請求金額</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ¥{finalAmount.toLocaleString()}
                                </span>
                            </div>
                            {discount > 0 && (
                                <p className="text-xs text-slate-500 mt-1 text-right">
                                    ¥{amount.toLocaleString()} - ¥{discount.toLocaleString()}（割引）
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 支払い方法 */}
                {!isConfirmed && (
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="font-bold text-slate-700 mb-3">支払い方法</h2>
                        <div className="grid grid-cols-3 gap-3">
                            {(['cash', 'credit', 'cashless'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={`py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                                        method === m
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {METHOD_LABEL[m]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 会計済み表示 */}
                {isConfirmed && reservation.payment && (
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="font-bold text-slate-700 mb-3">会計情報</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">支払い方法</span>
                                <span className="text-slate-800">{METHOD_LABEL[reservation.payment.method!]}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">会計日時</span>
                                <span className="text-slate-800">
                                    {reservation.payment.paid_at
                                        ? new Date(reservation.payment.paid_at).toLocaleString('ja-JP')
                                        : '-'}
                                </span>
                            </div>
                            {reservation.payment.memo && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">メモ</span>
                                    <span className="text-slate-800">{reservation.payment.memo}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* アクションボタン */}
                {!isConfirmed && (
                    <div className="space-y-3 pb-8">
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveDraft}
                                disabled={saving}
                                className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            >
                                {saving ? '保存中...' : '会計内容を保存'}
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(true)}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                            >
                                会計を確定する
                            </button>
                        </div>
                        {/* 会計済みの場合のみ取消しボタンを表示 */}
                        {reservation.payment && !reservation.payment.is_draft && (
                            <button
                                onClick={() => setCancelTarget(true)}
                                className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors"
                            >
                                会計を取消す
                            </button>
                        )}
                    </div>
                )}

                {savedAt && !isConfirmed && (
                    <p className="text-center text-xs text-slate-400 pb-4">
                        {savedAt.toLocaleTimeString('ja-JP')} に保存済み
                    </p>
                )}
            </div>
        </StaffGuard>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-slate-500">読み込み中...</div>}>
            <PaymentContent />
        </Suspense>
    );
}
