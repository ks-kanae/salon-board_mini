"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";

type Menu = {
    id: number;
    name: string;
    price: number;
    duration_minutes: number;
};

type Staff = {
    id: number;
    name: string;
};

function NewStaffReservationContent() {
    const router = useRouter();
    const { user } = useAuth();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [startAt, setStartAt] = useState('');
    const [type, setType] = useState<'manual' | 'next'>('manual');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const [showSuccess, setShowSuccess] = useState(false);
    const [completedInfo, setCompletedInfo] = useState<{
        date: string; time: string; menus: string; customerName: string; startAt: string; reservationId: number;
    } | null>(null);
    const customerIdFromUrl = searchParams.get('customer_id');
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [isNominated, setIsNominated] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState<{id: number; name: string; phone: string | null}[]>([]);
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    // デフォルトの日時を設定
        const getDefaultStartAt = () => {
            const now = new Date();
            const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const dateStr = jst.toISOString().split('T')[0];
            // 現在時刻が10時以降なら現在時刻の次の30分区切り、10時前なら10:00
            const jstHour = jst.getUTCHours();
            const jstMin = jst.getUTCMinutes();
            if (jstHour >= 10) {
                const nextMin = jstMin < 30 ? 30 : 0;
                const nextHour = jstMin < 30 ? jstHour : jstHour + 1;
                const pad = (n: number) => String(n).padStart(2, '0');
                return `${dateStr}T${pad(nextHour)}:${pad(nextMin)}`;
            }
            return `${dateStr}T10:00`;
        };

    useEffect(() => {
        const nameFromUrl = searchParams.get('customer_name');
        const phoneFromUrl = searchParams.get('customer_phone');
        const idFromUrl = searchParams.get('customer_id');
        const startAtFromUrl = searchParams.get('start_at');
        const staffIdFromUrl = searchParams.get('staff_id');

        if (idFromUrl) setCustomerId(idFromUrl);
        if (nameFromUrl) setCustomerName(decodeURIComponent(nameFromUrl));
        if (phoneFromUrl) setCustomerPhone(decodeURIComponent(phoneFromUrl));
        if (staffIdFromUrl) setStaffId(Number(staffIdFromUrl));

        // start_atがURLにあればそれを使い、なければデフォルト時刻
        if (startAtFromUrl) {
            setStartAt(decodeURIComponent(startAtFromUrl));
        } else {
            setStartAt(getDefaultStartAt());
        }

        Promise.all([
            api.get('/api/staff/menus'),
            api.get('/api/staff/members'),
        ]).then(([menusRes, staffRes]) => {
            setMenus(menusRes.data);
            setStaffList(staffRes.data);
            if (staffRes.data.length > 0 && user && !staffIdFromUrl) {
                const me = staffRes.data.find((s: Staff) => s.id === user.id);
                setStaffId(me?.id ?? staffRes.data[0].id);
            }
        });
    }, []);

    const selectedMenus = menus.filter(m => selectedMenuIds.includes(m.id));
    const totalPrice   = selectedMenus.reduce((sum, m) => sum + m.price, 0);
    const totalMinutes = selectedMenus.reduce((sum, m) => sum + m.duration_minutes, 0);

    const toggleMenu = (id: number) => {
        setSelectedMenuIds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const searchCustomers = async (q: string) => {
        if (!q) { setCustomerResults([]); return; }
        setSearchingCustomer(true);
        try {
            const res = await api.get('/api/staff/customers', { params: { search: q } });
            setCustomerResults(res.data.data ?? []);
        } finally {
            setSearchingCustomer(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || selectedMenuIds.length === 0 || !startAt) {
            setError('お客様名・メニュー・日時は必須です。');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const result = await api.post('/api/staff/reservations', {
                customer_id:    customerId || undefined,
                customer_name:  customerName,
                customer_phone: customerPhone,
                menu_ids:       selectedMenuIds,
                start_at:       startAt,
                type,
                staff_id:       staffId || undefined,
                notes,
                is_nominated:   isNominated,
            });
            const selectedMenus = menus.filter(m => selectedMenuIds.includes(m.id));
            const startDate = new Date(startAt);
            const jst = new Date(startDate.getTime() + 9 * 60 * 60 * 1000);
            const pad = (n: number) => String(n).padStart(2, '0');
            setCompletedInfo({
                customerName: customerName,
                date: `${jst.getUTCFullYear()}年${jst.getUTCMonth()+1}月${jst.getUTCDate()}日`,
                time: `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`,
                menus: selectedMenus.map(m => m.name).join('・'),
                startAt: startAt,
                reservationId: result.data.id,
            });
            setShowSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || '予約の作成に失敗しました。');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <StaffGuard>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">
                        ← 戻る
                    </button>
                    <h1 className="text-2xl font-bold text-slate-800">予約追加</h1>
                </div>

                    {showSuccess && completedInfo && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                        <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full">
                            <div className="text-center">
                                <div className="text-5xl text-blue-400 mb-4">✔︎</div>
                                <h2 className="text-xl font-bold text-blue-600 mb-1">予約が完了しました</h2>
                                <p className="text-slate-500 text-sm mb-6">予約を受け付けました</p>
                                <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">お客様</span>
                                        <span className="font-medium text-slate-800">{completedInfo.customerName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">日付</span>
                                        <span className="font-medium text-slate-800">{completedInfo.date}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">時間</span>
                                        <span className="font-medium text-slate-800">{completedInfo.time}〜</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">メニュー</span>
                                        <span className="font-medium text-slate-800 text-right max-w-[60%]">{completedInfo.menus}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const dateStr = completedInfo!.startAt.slice(0, 10);
                                            router.push(`/staff/reservations?date=${dateStr}&highlight=${completedInfo!.reservationId}`);
                                        }}
                                        className="flex-1 py-2 border border-blue-600 rounded-lg text-blue-600 hover:bg-slate-50 text-sm"
                                    >
                                        予約管理へ
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSuccess(false);
                                            setCompletedInfo(null);
                                            // お客様情報は保持、日時・メニューのみリセット
                                            setSelectedMenuIds([]);
                                            setNotes('');
                                            setStartAt(getDefaultStartAt()); // 今日の日付にリセット
                                        }}
                                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        続けて予約
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 予約種別 */}
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="font-bold text-slate-700 mb-3">予約種別</h2>
                        <div className="flex gap-3">
                            {(['manual', 'next'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                        type === t
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    {t === 'manual' ? '📞 電話予約' : '🔄 次回予約'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* お客様情報 */}
                    <div className="bg-white rounded-xl shadow p-5 space-y-3">
                        <h2 className="font-bold text-slate-700">お客様情報</h2>

                        {/* 顧客検索 */}
                        <div className="relative">
                            <label className="text-sm font-medium text-blue-600 mb-1 block">顧客を検索</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => {
                                        setCustomerSearch(e.target.value);
                                        searchCustomers(e.target.value);
                                    }}
                                    placeholder="名前・電話番号で検索"
                                    className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setCustomerSearch(''); setCustomerResults([]); }}
                                        className="text-slate-400 hover:text-slate-600 text-sm px-2"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {customerResults.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {customerResults.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setCustomerId(String(c.id));
                                                setCustomerName(c.name);
                                                setCustomerPhone(c.phone ?? '');
                                                setCustomerSearch('');
                                                setCustomerResults([]);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                                        >
                                            <p className="text-sm font-medium text-slate-800">{c.name}</p>
                                            <p className="text-xs text-slate-500">{c.phone ?? '電話番号未登録'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">お客様名 *</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={e => { setCustomerName(e.target.value); setCustomerId(null); }}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="山田 花子"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">電話番号</label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="090-0000-0000"
                            />
                        </div>
                    </div>

                    {/* メニュー選択 */}
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="font-bold text-slate-700 mb-3">メニュー *</h2>
                        <div className="space-y-2">
                            {menus.filter(m => m.is_active ?? true).map(menu => {
                                const selected = selectedMenuIds.includes(menu.id);
                                return (
                                    <button
                                        key={menu.id}
                                        type="button"
                                        onClick={() => toggleMenu(menu.id)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                            selected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{menu.name}</p>
                                                {menu.duration_minutes > 0 && (
                                                    <p className="text-xs text-slate-400">{menu.duration_minutes}分</p>
                                                )}
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
                        {selectedMenus.length > 0 && (
                            <div className="mt-3 bg-blue-50 rounded-lg p-3 flex justify-between">
                                <span className="text-sm text-slate-600">合計（{totalMinutes}分）</span>
                                <span className="font-bold text-slate-800">¥{totalPrice.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* 日時・担当 */}
                    <div className="bg-white rounded-xl shadow p-5 space-y-3">
                        <h2 className="font-bold text-slate-700">日時・担当</h2>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">予約日時 *</label>
                            <input
                                type="datetime-local"
                                value={startAt}
                                onChange={e => setStartAt(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">担当スタッフ</label>
                            <select
                                value={staffId}
                                onChange={e => setStaffId(Number(e.target.value))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isNominated}
                                    onChange={e => setIsNominated(e.target.checked)}
                                    className="w-4 h-4 rounded accent-blue-600"
                                />
                                <span className="text-sm text-slate-600 font-bold">指名予約</span>
                            </label>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">備考</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                placeholder="特記事項など"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? '作成中...' : '予約を作成する'}
                    </button>
                </form>
            </div>
        </StaffGuard>
    );
}

export default function NewStaffReservationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-slate-500">読み込み中...</div>}>
            <NewStaffReservationContent />
        </Suspense>
    );
}
