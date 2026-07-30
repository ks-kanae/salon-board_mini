"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/lib/auth-context";

type Menu = {
    id: number;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
};

type Staff = {
    id: number;
    name: string;
};

type Slot = {
    start_at: string;
    end_at: string;
    available: boolean;
};

type DateInfo = {
    closed: boolean;
    reason: 'closed' | 'suspended' | null;
};

type Step = 'menu' | 'datetime';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function ReservePage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const salonId = Number(params.id);

    const [step, setStep] = useState<Step>('menu');
    const [menus, setMenus] = useState<Menu[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);
    const [preferredStaffId, setPreferredStaffId] = useState<number | null>(null);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedReservation, setCompletedReservation] = useState<{
        date: string; time: string; endTime: string; menus: string; total: number; staffName: string;
    } | null>(null);

    const [weekOffset, setWeekOffset] = useState(0);
    const [slots, setSlots] = useState<Record<string, Slot[]>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [dateInfoMap, setDateInfoMap] = useState<Record<string, DateInfo>>({});

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'customer')) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        Promise.all([
            api.get(`/api/salons/${salonId}/menus`),
            api.get(`/api/salons/${salonId}/staff`),
        ]).then(([menusRes, staffRes]) => {
            setMenus(menusRes.data);
            setStaffList(staffRes.data);
        });
    }, [salonId]);

    const selectedMenus = menus.filter(m => selectedMenuIds.includes(m.id));
    const totalPrice   = selectedMenus.reduce((sum, m) => sum + m.price, 0);
    const totalMinutes = selectedMenus.reduce((sum, m) => sum + m.duration_minutes, 0);

    const toggleMenu = (id: number) => {
        setSelectedMenuIds(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
        setSelectedSlot(null);
    };

    // 今日から7日間（当日予約対応）
    const getWeekDates = () => {
        const dates: Date[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + weekOffset * 7 + i); // 今日から（+1なし）
            dates.push(d);
        }
        return dates;
    };

    const formatDateKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const goToDatetime = async () => {
        if (selectedMenuIds.length === 0) { setError("メニューを1つ以上選択してください。"); return; }
        if (totalMinutes === 0) { setError("所要時間が0分のメニューのみでは予約できません。"); return; }
        setError("");
        setStep('datetime');
        await fetchWeekSlots();
    };

    const fetchWeekSlots = async () => {
        setLoadingSlots(true);
        const dates = getWeekDates();
        const results: Record<string, Slot[]> = {};
        const infoMap: Record<string, DateInfo> = {};

        await Promise.all(dates.map(async (d) => {
            const key = formatDateKey(d);
            try {
                // 定休日チェック
                const closureRes = await api.get(`/api/salons/${salonId}/closure`, {
                    params: { date: key }
                });
                if (closureRes.data.closed) {
                    infoMap[key] = { closed: true, reason: closureRes.data.reason };

                    if (closureRes.data.reason === 'suspended') {
                        // 予約停止は時間枠は取得するが選択不可にする
                        const res = await api.get('/api/availability', {
                            params: {
                                salon_id: salonId,
                                date: key,
                                duration: totalMinutes,
                                menu_ids: selectedMenuIds,
                                preferred_staff_id: preferredStaffId || undefined,
                            }
                        });
                        results[key] = res.data; // スロットは取得
                    } else {
                        results[key] = []; // 定休日はスロットなし
                    }
                    return;
                }
                infoMap[key] = { closed: false, reason: null };

                // 空き時間取得
                const res = await api.get('/api/availability', {
                    params: {
                        salon_id: salonId,
                        date: key,
                        duration: totalMinutes,
                        menu_ids: selectedMenuIds,
                        preferred_staff_id: preferredStaffId || undefined,
                    }
                });
                results[key] = res.data;
            } catch { results[key] = [];
                infoMap[key] = { closed: false, reason: null };
            }
        }));
        setSlots(results);
        setDateInfoMap(infoMap);
        setLoadingSlots(false);
    };

    useEffect(() => {
        if (step === 'datetime' && totalMinutes > 0) fetchWeekSlots();
    }, [weekOffset]);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Tokyo",
        });
    };

    const handleSubmit = async () => {
        if (!selectedSlot) { setError("日時を選択してください。"); return; }
        setSubmitting(true);
        setError("");
        try {
            await api.post("/api/reservations", {
                salon_id: salonId,
                menu_ids: selectedMenuIds,
                start_at: selectedSlot.start_at,
                notes,
                preferred_staff_id: preferredStaffId || undefined,
                is_nominated: preferredStaffId !== null,
            });
            const staffName = preferredStaffId
                ? staffList.find(s => s.id === preferredStaffId)?.name ?? '指名なし'
                : '指名なし';
            const [datePart] = selectedSlot.start_at.split("T");
            const [year, month, day] = datePart.split("-").map(Number);

            const weekday =
                ['日', '月', '火', '水', '木', '金', '土'][
                    new Date(year, month - 1, day).getDay()
                ];

            setCompletedReservation({
                date: `${year}年${month}月${day}日（${weekday}）`,
                time: formatTime(selectedSlot.start_at),
                endTime: formatTime(selectedSlot.end_at),
                menus: selectedMenus.map(m => m.name).join('・'),
                total: totalPrice,
                staffName,
            });
            setShowSuccessModal(true);
        } catch (err: any) {
            const msg = err.response?.data?.message
                || err.response?.data?.errors?.start_at?.[0]
                || "予約に失敗しました。時間をおいて再度お試しください。";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;

    const weekDates = getWeekDates();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* 予約完了モーダル */}
            {showSuccessModal && completedReservation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full">
                        <div className="text-center">
                            <div className="text-5xl mb-4">🎉</div>
                            <h2 className="text-xl font-bold text-gray-800 mb-1">予約が完了しました</h2>
                            <p className="text-gray-500 text-sm mb-6">ご予約ありがとうございます</p>
                            <div className="bg-pink-50 rounded-lg p-4 text-left space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">日付</span>
                                    <span className="font-medium text-gray-800">{completedReservation.date}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">時間</span>
                                    <span className="font-medium text-gray-800">{completedReservation.time} 〜 {completedReservation.endTime}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">メニュー</span>
                                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{completedReservation.menus}</span>
                                </div>
                                {completedReservation.staffName !== '指名なし' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">担当</span>
                                        <span className="font-medium text-gray-800">{completedReservation.staffName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm border-t pt-2">
                                    <span className="text-gray-500">合計金額</span>
                                    <span className="font-bold text-gray-800">¥{completedReservation.total.toLocaleString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push("/reservations")}
                                className="w-full bg-rose-400 text-white py-3 rounded-lg font-semibold hover:bg-rose-500 transition-colors"
                            >
                                予約一覧を確認する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ステップインジケーター */}
            <div className="flex items-center mb-8">
                <div className={`flex items-center gap-2 ${step === 'menu' ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${step === 'menu' ? 'bg-rose-400 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
                    メニュー・担当選択
                </div>
                <div className="flex-1 h-px bg-gray-200 mx-3" />
                <div className={`flex items-center gap-2 ${step === 'datetime' ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${step === 'datetime' ? 'bg-rose-400 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                    日時選択
                </div>
            </div>

            {/* STEP 1 */}
            {step === 'menu' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push(`/salons/${salonId}`)} className="text-gray-400 hover:text-gray-600 text-sm">← 店舗詳細に戻る</button>
                        <h1 className="text-2xl font-bold text-gray-800">ネット予約</h1>
                    </div>

                    {/* メニュー選択 */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            メニューを選択 <span className="text-red-500">*</span>
                        </h2>
                        <div className="grid gap-3">
                            {menus.map(menu => {
                                const selected = selectedMenuIds.includes(menu.id);
                                return (
                                    <button key={menu.id} type="button" onClick={() => toggleMenu(menu.id)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${selected ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-800">{menu.name}</p>
                                                {menu.description && <p className="text-gray-500 text-sm mt-0.5">{menu.description}</p>}
                                                {menu.duration_minutes > 0 && <p className="text-gray-400 text-sm mt-0.5">所要時間：{menu.duration_minutes}分</p>}
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="font-bold text-gray-800">¥{menu.price.toLocaleString()}</p>
                                                {selected && <span className="text-pink-500 text-xs">✓ 選択中</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* スタッフ指名 */}
                    {staffList.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-700 mb-3">担当スタッフ</h2>
                            <div className="flex items-center gap-3">
                                {/* 指名なし */}
                                <button
                                    type="button"
                                    onClick={() => setPreferredStaffId(null)}
                                    className={`px-10 py-2 rounded-lg border-2 text-sm transition-colors shrink-0 ${
                                        preferredStaffId === null
                                            ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    指名なし
                                </button>

                                {/* 指名するボタン */}
                                <button
                                    type="button"
                                    onClick={() => setPreferredStaffId(staffList[0].id)}
                                    className={`px-10 py-2 rounded-lg border-2 text-sm transition-colors shrink-0 ${
                                        preferredStaffId !== null
                                            ? 'border-pink-400 bg-pink-50 text-pink-700 font-medium'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    指名する
                                </button>

                                {/* プルダウン（指名する選択時のみ有効） */}
                                <select
                                    value={preferredStaffId ?? ''}
                                    onChange={e => setPreferredStaffId(e.target.value ? Number(e.target.value) : null)}
                                    disabled={preferredStaffId === null}
                                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition-colors ${
                                        preferredStaffId !== null
                                            ? 'border-pink-300 bg-white text-gray-800'
                                            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {staffList.map(staff => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {preferredStaffId && (
                                <p className="text-gray-400 text-xs mt-2">
                                    ※ 指名スタッフが対応できない時間帯は選択できません
                                </p>
                            )}
                        </div>
                    )}

                    {/* 選択中メニューサマリー */}
                    {selectedMenus.length > 0 && (
                        <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                            <h3 className="font-semibold text-gray-700 mb-2">選択中のメニュー</h3>
                            {selectedMenus.map(m => (
                                <div key={m.id} className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>{m.name}</span><span>¥{m.price.toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="border-t border-pink-200 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                                <span>合計{totalMinutes > 0 ? `（所要時間：${totalMinutes}分）` : ''}</span>
                                <span>¥{totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* 備考 */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">備考（任意）</h2>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                            placeholder="アレルギーや気になることがあればご記入ください"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
                        />
                    </div>

                    {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md">{error}</div>}

                    <button type="button" onClick={goToDatetime}
                        className="w-full bg-rose-400 text-white py-3 rounded-lg font-semibold hover:bg-rose-500 transition-colors"
                    >
                        日時を選ぶ →
                    </button>
                </div>
            )}

            {/* STEP 2 */}
            {step === 'datetime' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => { setStep('menu'); setSelectedSlot(null); }}
                            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                        >
                            ← メニュー選択に戻る
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">日時を選択</h1>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 flex justify-between">
                        <span>{selectedMenus.map(m => m.name).join(' + ')}</span>
                        <span className="font-bold text-gray-800">¥{totalPrice.toLocaleString()}　{totalMinutes}分</span>
                    </div>

                    {preferredStaffId && (
                        <div className="bg-pink-50 rounded-lg px-3 py-2 text-sm text-pink-700">
                            担当：{staffList.find(s => s.id === preferredStaffId)?.name}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <button type="button" onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                            disabled={weekOffset === 0} className="px-3 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
                        >← 前の週</button>
                        <span className="text-sm text-gray-600">
                            {weekDates[0].getMonth() + 1}/{weekDates[0].getDate()} 〜 {weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
                        </span>
                        <button type="button" onClick={() => setWeekOffset(prev => Math.min(13, prev + 1))}
                            disabled={weekOffset >= 3} className="px-3 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
                        >次の週 →</button>
                    </div>

                    {loadingSlots ? (
                        <div className="text-center py-12 text-gray-500">空き状況を確認中...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr>
                                        <th className="w-16 p-2 text-gray-500 font-normal border-b"></th>
                                        {weekDates.map((d, i) => {
                                            const dateKey = formatDateKey(d);
                                            const info = dateInfoMap[dateKey];
                                            return (
                                                <th key={i} className={`p-4 text-center border-b`}>
                                                    <div className="text-gray-500 text-xs">{DAYS[d.getDay()]}</div>
                                                    <div className={`text-base ${
                                                        info?.closed ? 'text-gray-400' :
                                                        d.getDay() === 0 ? 'text-red-500' :
                                                        d.getDay() === 6 ? 'text-blue-500' : 'text-gray-800'
                                                    }`}>
                                                        {d.getDate()}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        // 定休日でない最初の日のスロットを時間軸に使う
                                        const referenceSlots = weekDates
                                            .map(d => slots[formatDateKey(d)])
                                            .find(s => s && s.length > 0) ?? [];

                                        if (referenceSlots.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">
                                                        この週は予約可能な時間帯がありません
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return referenceSlots.map((slot, slotIdx) => (
                                            <tr key={slotIdx} className="border-b border-gray-100">
                                                <td className="p-2 text-gray-400 text-xs text-right pr-3">{formatTime(slot.start_at)}</td>
                                                {weekDates.map((d, dayIdx) => {
                                                    const dateKey = formatDateKey(d);
                                                    const info = dateInfoMap[dateKey];
                                                    const s = (slots[dateKey] || [])[slotIdx];

                                                    // 定休日（closed）→ 縦結合で「定休日」表示
                                                    if (info?.reason === 'closed') {
                                                        if (slotIdx === 0) {
                                                            return (
                                                                <td key={dayIdx} className="p-1 text-center align-middle" rowSpan={referenceSlots.length}>
                                                                    <span className="text-xs font-medium text-gray-300">定休日</span>
                                                                </td>
                                                            );
                                                        }
                                                        return null;
                                                    }

                                                    // 予約停止（suspended）
                                                    if (info?.reason === 'suspended') {
                                                        return (
                                                            <td key={dayIdx} className="p-1 text-center">
                                                                <span className="text-gray-300 text-xs">ー</span>
                                                            </td>
                                                        );
                                                    }

                                                    if (!s) return <td key={dayIdx} className="p-1 text-center text-gray-300 text-xs">-</td>;
                                                    const isSelected = selectedSlot?.start_at === s?.start_at;
                                                    return (
                                                        <td key={dayIdx} className="p-1 text-center">
                                                            {s.available ? (
                                                                <button type="button" onClick={() => setSelectedSlot(s)}
                                                                    className={`w-full py-1 rounded text-xs font-medium transition-colors ${
                                                                        isSelected ? 'bg-pink-400 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                                    }`}
                                                                >
                                                                    {isSelected ? '✓' : '○'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">×</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedSlot && (() => {
                        const [datePart] = selectedSlot.start_at.split("T");
                        const [year, month, day] = datePart.split("-").map(Number);

                        const weekday =
                            ['日', '月', '火', '水', '木', '金', '土'][
                                new Date(year, month - 1, day).getDay()
                            ];

                        return (
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                                <p className="font-semibold text-gray-800">
                                    {`${year}年${month}月${day}日（${weekday}）`}
                                </p>

                                <p className="text-gray-600">
                                    {formatTime(selectedSlot.start_at)}
                                    〜
                                    {formatTime(selectedSlot.end_at)}
                                    （{totalMinutes}分）
                                </p>
                            </div>
                        );
                    })()}

                    {error && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md">{error}</div>}

                    <button type="button" onClick={handleSubmit} disabled={!selectedSlot || submitting}
                        className="w-full bg-rose-400 text-white py-3 rounded-lg font-semibold hover:bg-rose-500 disabled:bg-rose-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? "予約中..." : "予約を確定する"}
                    </button>
                </div>
            )}
        </div>
    );
}
