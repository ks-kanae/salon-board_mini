"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";

type Staff = { id: number; name: string };
type ShiftMap = Record<number, Record<string, boolean>>;
type ClosureType = 'closed' | 'suspended';
type Closure = { id: number; date: string; type: ClosureType; reason: string | null };

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_LABELS = DAYS;

export default function StaffShiftsPage() {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date(
            new Date().toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo"
            })
        );

        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [shiftMap, setShiftMap] = useState<ShiftMap>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // 定休日・予約停止
    const [closures, setClosures] = useState<Closure[]>([]);
    const [closedWeekdays, setClosedWeekdays] = useState<number[]>([]);
    const [showClosurePanel, setShowClosurePanel] = useState(false);
    const [closureMode, setClosureMode] = useState<ClosureType>('closed');
    const [bulkFrom, setBulkFrom] = useState('');
    const [bulkTo, setBulkTo] = useState('');
    const [bulkReason, setBulkReason] = useState('');
    const [savingClosure, setSavingClosure] = useState(false);
    const [salonHours, setSalonHours] = useState<{ open_hour: number; close_hour: number } | null>(null);
    const [editingHours, setEditingHours] = useState(false);
    const [newOpenHour, setNewOpenHour] = useState(10);
    const [newCloseHour, setNewCloseHour] = useState(19);
    const [savingHours, setSavingHours] = useState(false);

    const fetchShifts = async () => {
        setLoading(true);
        try {
            const [shiftRes, closureRes, salonRes] = await Promise.all([
                api.get('/api/staff/shifts', { params: { month: currentMonth + '-01' } }),
                api.get('/api/staff/closures', { params: { month: currentMonth + '-01' } }),
                api.get('/api/staff/salon'),
            ]);
            setStaffList(shiftRes.data.staff);
            setShiftMap(shiftRes.data.shift_map);
            setClosures(closureRes.data.closures);
            setClosedWeekdays(closureRes.data.closed_weekdays ?? []);
            setSalonHours({ open_hour: salonRes.data.open_hour, close_hour: salonRes.data.close_hour });
            setNewOpenHour(salonRes.data.open_hour);
            setNewCloseHour(salonRes.data.close_hour);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchShifts(); }, [currentMonth]);

    // 月のカレンダー日付一覧を生成
    const getMonthDates = () => {
        const [year, month] = currentMonth.split('-').map(Number);
        const dates: Date[] = [];
        const lastDay = new Date(year, month, 0).getDate();
        for (let day = 1; day <= lastDay; day++) {
            dates.push(new Date(year, month - 1, day));
        }
        return dates;
    };

    const formatKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const isWorking = (staffId: number, dateKey: string): boolean => {
        if (!shiftMap[staffId] || shiftMap[staffId][dateKey] === undefined) return true;
        return shiftMap[staffId][dateKey];
    };

    const getClosure = (dateKey: string): Closure | undefined =>
        closures.find(c => c.date === dateKey);

    const isClosedWeekday = (d: Date): boolean =>
        closedWeekdays.includes(d.getDay());

    const toggleShift = async (staffId: number, dateKey: string) => {
        const current = isWorking(staffId, dateKey);
        const saveKey = `${staffId}-${dateKey}`;
        setSaving(saveKey);
        try {
            await api.post('/api/staff/shifts', {
                user_id:    staffId,
                date:       dateKey,
                is_working: !current,
            });
            setShiftMap(prev => ({
                ...prev,
                [staffId]: { ...(prev[staffId] ?? {}), [dateKey]: !current },
            }));
        } finally {
            setSaving(null);
        }
    };

    const toggleClosure = async (dateKey: string) => {
        setSavingClosure(true);
        try {
            const res = await api.post('/api/staff/closures/toggle', {
                date:   dateKey,
                type:   closureMode,
                reason: null,
            });
            if (res.data.action === 'added') {
                setClosures(prev => [...prev, res.data.closure]);
            } else {
                setClosures(prev => prev.filter(c => c.date !== res.data.date));
            }
        } finally {
            setSavingClosure(false);
        }
    };

    const toggleWeekday = async (day: number) => {
        const newWeekdays = closedWeekdays.includes(day)
            ? closedWeekdays.filter(d => d !== day)
            : [...closedWeekdays, day];
        setClosedWeekdays(newWeekdays);
        await api.patch('/api/staff/closures/weekdays', { closed_weekdays: newWeekdays });
    };

    const handleBulkSet = async (action: 'add' | 'remove') => {
        if (!bulkFrom) return;
        setSavingClosure(true);
        try {
            await api.post('/api/staff/closures/bulk', {
                date_from: bulkFrom,
                date_to:   bulkTo || bulkFrom,
                type:      closureMode,
                reason:    bulkReason || null,
                action,
            });
            await fetchShifts();
            setBulkFrom('');
            setBulkTo('');
            setBulkReason('');
        } finally {
            setSavingClosure(false);
        }
    };

    // 当月全日一括
    const handleBulkMonth = async (action: 'add' | 'remove') => {
        const [year, month] = currentMonth.split('-').map(Number);
        const from = `${currentMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
        setSavingClosure(true);
        try {
            await api.post('/api/staff/closures/bulk', {
                date_from: from,
                date_to:   to,
                type:      closureMode,
                reason:    null,
                action,
            });
            await fetchShifts();
        } finally {
            setSavingClosure(false);
        }
    };

    const prevMonth = () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const nextMonth = () => {
        const [y, m] = currentMonth.split('-').map(Number);
        const d = new Date(y, m, 1);
        setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const dates = getMonthDates();
    const today = new Date(
        new Date().toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo"
        })
    );

    today.setHours(0,0,0,0);

    return (
        <StaffGuard>
            <div className="space-y-4">
                {/* ヘッダー */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">シフト管理</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowClosurePanel(prev => !prev)}
                            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                                showClosurePanel
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            🚫 定休日・予約停止
                        </button>
                        <button onClick={prevMonth} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">◀</button>
                        <span className="font-medium text-slate-700 min-w-24 text-center">
                            {currentMonth.replace('-', '年')}月
                        </span>
                        <button onClick={nextMonth} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">▶</button>
                    </div>
                </div>

                {/* 定休日・予約停止パネル */}
                {showClosurePanel && (
                    <div className="bg-white rounded-xl shadow p-5 space-y-5 border-2 border-orange-200">
                        <h2 className="font-bold text-slate-800">🚫 定休日・予約停止設定</h2>

                        {/* モード切り替え */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">設定種別</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setClosureMode('closed')}
                                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                                        closureMode === 'closed'
                                            ? 'bg-red-500 text-white border-red-500'
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    定休日
                                </button>
                                <button
                                    onClick={() => setClosureMode('suspended')}
                                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                                        closureMode === 'suspended'
                                            ? 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    予約停止
                                </button>
                            </div>
                        </div>

                        {/* 曜日指定 */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">毎週定休曜日</p>
                            <div className="flex gap-2">
                                {WEEKDAY_LABELS.map((label, i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleWeekday(i)}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${
                                            closedWeekdays.includes(i)
                                                ? 'bg-red-500 text-white border-red-500'
                                                : i === 0 ? 'text-red-500 border-slate-300 hover:bg-red-50'
                                                : i === 6 ? 'text-blue-500 border-slate-300 hover:bg-blue-50'
                                                : 'text-slate-600 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 個別日付クリック */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">日付をクリックして個別設定</p>
                            <div className="flex flex-wrap gap-1">
                                {dates.map(d => {
                                    const dateKey = formatKey(d);
                                    const closure = getClosure(dateKey);
                                    const isSun = d.getDay() === 0;
                                    const isSat = d.getDay() === 6;
                                    return (
                                        <button
                                            key={dateKey}
                                            onClick={() => toggleClosure(dateKey)}
                                            disabled={savingClosure}
                                            className={`w-9 h-9 rounded-lg text-xs font-medium border transition-colors ${
                                                closure?.type === 'suspended'
                                                    ? 'bg-orange-400 text-white border-orange-400'
                                                : closure?.type === 'closed' || isClosedWeekday(d)
                                                    ? 'bg-red-400 text-white border-red-400'
                                                : isSun
                                                    ? 'text-red-500 border-slate-200 hover:bg-red-50'
                                                : isSat
                                                    ? 'text-blue-500 border-slate-200 hover:bg-blue-50'
                                                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                            title={dateKey}
                                        >
                                            {d.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 期間指定・一括設定 */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">期間指定</p>
                            <div className="flex gap-2 items-end flex-wrap">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">開始日</label>
                                    <input
                                        type="date"
                                        value={bulkFrom}
                                        onChange={e => setBulkFrom(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">終了日</label>
                                    <input
                                        type="date"
                                        value={bulkTo}
                                        onChange={e => setBulkTo(e.target.value)}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">メモ（任意）</label>
                                    <input
                                        type="text"
                                        value={bulkReason}
                                        onChange={e => setBulkReason(e.target.value)}
                                        placeholder="夏季休暇など"
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-36"
                                    />
                                </div>
                                <button
                                    onClick={() => handleBulkSet('add')}
                                    disabled={!bulkFrom || savingClosure}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                                >
                                    設定する
                                </button>
                                <button
                                    onClick={() => handleBulkSet('remove')}
                                    disabled={!bulkFrom || savingClosure}
                                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    解除する
                                </button>
                            </div>
                        </div>

                        {/* 当月全日一括 */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-2">当月全日一括</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleBulkMonth('add')}
                                    disabled={savingClosure}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                                >
                                    {currentMonth.replace('-', '年')}月を全日設定
                                </button>
                                <button
                                    onClick={() => handleBulkMonth('remove')}
                                    disabled={savingClosure}
                                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    全日解除
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400">
                            💡 カレンダーの日付をクリックして個別に設定することもできます
                        </p>
                    </div>
                )}

                {/* 営業時間設定 */}
                {salonHours && (
                    <div className="bg-white rounded-xl shadow p-5 space-y-4 border-2 border-blue-100">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">🕐 営業時間</h2>
                            {!editingHours && (
                                <button
                                    onClick={() => setEditingHours(true)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    変更する
                                </button>
                            )}
                        </div>
                        {editingHours ? (
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={newOpenHour}
                                        onChange={e => setNewOpenHour(Number(e.target.value))}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={i}>{i}:00</option>
                                        ))}
                                    </select>
                                    <span className="text-slate-500">〜</span>
                                    <select
                                        value={newCloseHour}
                                        onChange={e => setNewCloseHour(Number(e.target.value))}
                                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}:00</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingHours(false);
                                            setNewOpenHour(salonHours.open_hour);
                                            setNewCloseHour(salonHours.close_hour);
                                        }}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setSavingHours(true);
                                            try {
                                                await api.patch('/api/staff/salon/hours', {
                                                    open_hour:  newOpenHour,
                                                    close_hour: newCloseHour,
                                                });
                                                setSalonHours({ open_hour: newOpenHour, close_hour: newCloseHour });
                                                setEditingHours(false);
                                            } finally {
                                                setSavingHours(false);
                                            }
                                        }}
                                        disabled={savingHours || newOpenHour >= newCloseHour}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {savingHours ? '保存中...' : '保存する'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-700">
                                {salonHours.open_hour}:00 〜 {salonHours.close_hour}:00
                            </p>
                        )}
                    </div>
                )}

                <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
                    💡 デフォルトは全員出勤です。休みの日をクリックしてください。
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500">読み込み中...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left font-medium text-slate-600 border-b border-r border-slate-200 min-w-28">
                                        スタッフ
                                    </th>
                                    {dates.map(d => {
                                        const dateKey = formatKey(d);
                                        const isToday = d.getTime() === today.getTime();
                                        const isSun = d.getDay() === 0;
                                        const isSat = d.getDay() === 6;
                                        const closure = getClosure(dateKey);
                                        const isClosedDay = !!closure || isClosedWeekday(d);
                                        return (
                                            <th
                                                key={dateKey}
                                                className={`px-1 py-2 text-center font-medium border-b border-slate-200 min-w-10 cursor-pointer transition-colors ${
                                                    closure?.type === 'suspended' ? 'bg-orange-50' :
                                                    isClosedDay ? 'bg-red-50' :
                                                    isToday ? 'bg-blue-100' : ''
                                                }`}
                                                onClick={() => showClosurePanel && toggleClosure(dateKey)}
                                                title={closure ? (closure.type === 'closed' ? '定休日' : '予約停止') + (closure.reason ? `：${closure.reason}` : '') : isClosedWeekday(d) ? '定休曜日' : ''}
                                            >
                                                <div className={`text-xs ${isSun || isClosedDay ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-slate-500'}`}>
                                                    {DAYS[d.getDay()]}
                                                </div>
                                                <div className={`font-bold text-xs ${
                                                    closure?.type === 'suspended' ? 'text-orange-500' :
                                                    isClosedDay ? 'text-red-500' :
                                                    isToday ? 'text-blue-600' :
                                                    isSun ? 'text-red-500' :
                                                    isSat ? 'text-blue-500' : 'text-slate-700'
                                                }`}>
                                                    {d.getDate()}
                                                </div>
                                                {closure && (
                                                    <div className="text-xs">
                                                        {closure.type === 'closed' ? '🚫' : '⛔'}
                                                    </div>
                                                )}
                                                {!closure && isClosedWeekday(d) && (
                                                    <div className="text-xs">🚫</div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.map(staff => (
                                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                        <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-700 border-r border-slate-200">
                                            {staff.name}
                                        </td>
                                        {dates.map(d => {
                                            const dateKey = formatKey(d);
                                            const working = isWorking(staff.id, dateKey);
                                            const isSaving = saving === `${staff.id}-${dateKey}`;
                                            const closure = getClosure(dateKey);
                                            const isClosedDay = !!closure || isClosedWeekday(d);
                                            return (
                                                <td key={dateKey} className={`px-1 py-1 text-center ${
                                                    closure?.type === 'suspended' ? 'bg-orange-50' :
                                                    isClosedDay ? 'bg-red-50' : ''
                                                }`}>
                                                    {isClosedDay ? (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center text-slate-300 text-xs mx-auto">
                                                            —
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => toggleShift(staff.id, dateKey)}
                                                            disabled={isSaving}
                                                            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                                                                isSaving ? 'bg-slate-200 text-slate-400' :
                                                                working ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                                'bg-red-100 text-red-600 hover:bg-red-200'
                                                            }`}
                                                        >
                                                            {isSaving ? '…' : working ? '○' : '×'}
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 凡例 */}
                <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-green-100 inline-block"></span>○ 出勤
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-red-100 inline-block"></span>× 休み
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-red-50 inline-block"></span>🚫 定休日
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-orange-50 inline-block"></span>⛔ 予約停止
                    </span>
                </div>
            </div>
        </StaffGuard>
    );
}
