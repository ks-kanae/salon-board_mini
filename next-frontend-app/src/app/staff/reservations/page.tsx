"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/lib/auth-context";
import StaffGuard from "@/components/StaffGuard";
import { getJstDateString, toJst } from '@/lib/date';
import { StaffReservation, ScheduleBlock } from "@/types/reservation";

import ReservationDetailModal from "@/components/staff/reservations/modals/ReservationDetailModal";
import CancelConfirmModal from "@/components/staff/reservations/modals/CancelConfirmModal";
import PendingChangeModal from "@/components/staff/reservations/modals/PendingChangeModal";
import DragConflictModal from "@/components/staff/reservations/modals/DragConflictModal";
import DragErrorModal from "@/components/staff/reservations/modals/DragErrorModal";
import EditSuccessModal from "@/components/staff/reservations/modals/EditSuccessModal";
import ConflictWarningModal from "@/components/staff/reservations/modals/ConflictWarningModal";
import SlotModal from "@/components/staff/reservations/modals/SlotModal";
import BlockModal from "@/components/staff/reservations/modals/BlockModal";
import EditBlockModal from "@/components/staff/reservations/modals/EditBlockModal";
import EditReservationModal from "@/components/staff/reservations/modals/EditReservationModal";
import Toast from "@/components/Toast";
import { useReservationDrag } from "@/hooks/useReservationDrag";

// ========== 型定義 ==========
type Staff = { id: number; name: string };

// ========== 定数・ヘルパー ==========
const getReservationColor = (r: StaffReservation) => {
    if (r.payment && !r.payment.is_draft) return 'bg-gray-200 border-gray-300';
    return 'bg-yellow-50 border-yellow-300';
};

const TYPE_LABEL: Record<StaffReservation['type'], string> = {
    online: 'ネット', manual: '電話', next: '次回',
};

const CELL_WIDTH = 80;
const ROW_HEIGHT = 80;
const TIME_LABEL_WIDTH = 150;

const toJstStr = (d: Date): string => {
    const jst = toJst(d.toISOString());
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth()+1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:00`;
};

const isoToJstString = (iso: string): string => toJstStr(new Date(iso));

// ========== メインコンポーネント ==========
function StaffReservationsContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // ===== State =====
    const [date, setDate] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('date') ?? getJstDateString();
        }
        return getJstDateString();
    });
    const [reservations, setReservations] = useState<StaffReservation[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<StaffReservation | null>(null);
    const [pendingCancel, setPendingCancel] = useState<StaffReservation | null>(null);
    const [pendingChange, setPendingChange] = useState<{
        reservationId: number;
        newStart: string;
        newEnd: string;
        newStaffId: number | null;
        originalStart: string;
        originalEnd: string;
        originalStaffId: number | null;
    } | null>(null);
    const [closedDates, setClosedDates] = useState<string[]>([]);
    const [editingReservation, setEditingReservation] = useState<StaffReservation | null>(null);
    const [editMenuIds, setEditMenuIds] = useState<number[]>([]);
    const [editIsNominated, setEditIsNominated] = useState(false);
    const [allMenus, setAllMenus] = useState<{id: number; name: string; price: number; duration_minutes: number}[]>([]);
    const [newStartAt, setNewStartAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [showEditSuccess, setShowEditSuccess] = useState<{ date: string; time: string; menus: string } | null>(null);
    const [conflictWarning, setConflictWarning] = useState<string | null>(null);
    const [pendingSave, setPendingSave] = useState<{ startStr: string; endStr: string; menuRes: any; reservationId: number } | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [dragError, setDragError] = useState<string | null>(null);
    const [dragConflict, setDragConflict] = useState<{ newStart: string; newEnd: string; reservationId: number; status: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [editStaffId, setEditStaffId] = useState<number | null>(null);
    const [editType, setEditType] = useState<'online' | 'manual' | 'next'>('manual');
    const [staffListForEdit, setStaffListForEdit] = useState<{ id: number; name: string }[]>([]);
    const tableRef = useRef<HTMLDivElement>(null);
    const [closureInfo, setClosureInfo] = useState<{ closed: boolean; reason: string | null } | null>(null);
    const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
    const [showSlotModal, setShowSlotModal] = useState<{ staffId: number; startAt: string } | null>(null);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockTitle, setBlockTitle] = useState('予定');
    const [blockDuration, setBlockDuration] = useState(30);
    const [savingBlock, setSavingBlock] = useState(false);
    const [shiftMap, setShiftMap] = useState<Record<number, Record<string, boolean>>>({});
    const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
    const [editBlockDuration, setEditBlockDuration] = useState(30);
    const [editBlockTitle, setEditBlockTitle] = useState('');
    const [savingBlockEdit, setSavingBlockEdit] = useState(false);
    const [showBlockMoveSuccess, setShowBlockMoveSuccess] = useState(false);
    const [blockSuccessMessage, setBlockSuccessMessage] = useState('');
    const [blockError, setBlockError] = useState<string | null>(null);
    const [openHour, setOpenHour] = useState(10);
    const [closeHour, setCloseHour] = useState(19);
    const totalSlots = (closeHour - openHour) * 2;

    const formatTime = (iso: string): string => {
        return new Date(iso).toLocaleTimeString('ja-JP', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo',
        });
    };

    const toLocalDatetimeInput = (iso: string) => {
        const jst = toJst(iso);
        return jst.toISOString().slice(0, 16);
    };

    // ===== データ取得 =====
    const fetchData = async (targetDate?: string, highlightId?: string) => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        const currentDate = targetDate ?? date;
        setLoading(true);
        try {
            const [resRes, staffRes, blocksRes, shiftRes, salonRes] = await Promise.all([
                api.get('/api/staff/reservations', { params: { date: currentDate }, signal: abortControllerRef.current.signal }),
                api.get('/api/staff/members', { signal: abortControllerRef.current.signal }),
                api.get('/api/staff/schedule-blocks', { params: { date: currentDate }, signal: abortControllerRef.current.signal }),
                api.get('/api/staff/shifts', { params: { month: currentDate }, signal: abortControllerRef.current.signal }),
                api.get('/api/staff/salon'),
            ]);
            setReservations(resRes.data);
            setStaffList(staffRes.data);
            setScheduleBlocks(blocksRes.data);
            setShiftMap(shiftRes.data.shift_map ?? {});
            setOpenHour(salonRes.data.open_hour);
            setCloseHour(salonRes.data.close_hour);

            api.get('/api/staff/closing', { params: { date: currentDate } }).then(res => {
                if (res.data.is_closed) {
                    setClosedDates(prev => prev.includes(currentDate) ? prev : [...prev, currentDate]);
                }
            });

            if (user?.salon_id) {
                api.get(`/api/salons/${user.salon_id}/closure`, { params: { date: currentDate } })
                    .then(res => setClosureInfo(res.data.closed ? { closed: true, reason: res.data.reason } : null))
                    .catch(() => setClosureInfo(null));
            }

            if (highlightId) {
                const target = resRes.data.find((r: StaffReservation) => r.id === Number(highlightId));
                if (target) setSelectedReservation(target);
            }
        } catch (err: any) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        } finally {
            setLoading(false);
        }
    };

    // ===== 予約編集 =====
    const saveDateTime = async (startStr: string, endStr: string, menuRes: any, force: boolean) => {
        try {
            const dateRes = await api.patch(
                `/api/staff/reservations/${editingReservation!.id}`,
                { start_at: startStr, end_at: endStr, is_nominated: editIsNominated, staff_id: editStaffId,...(editingReservation!.type !== 'online' && { type: editType }), force }
            );
            setReservations(prev => prev.map(r =>
                r.id === editingReservation!.id
                    ? { ...r, ...menuRes.data, start_at: dateRes.data.start_at, end_at: dateRes.data.end_at, is_nominated: editIsNominated, staff_id: editStaffId, type: editType }
                    : r
            ));
            const [datePart, timePart] = startStr.split('T');
            const [h, mi] = timePart.split(':').map(Number);
            const pad = (n: number) => String(n).padStart(2, '0');
            setShowEditSuccess({
                date: `${datePart.slice(0,4)}年${parseInt(datePart.slice(5,7))}月${parseInt(datePart.slice(8,10))}日`,
                time: `${pad(h)}:${pad(mi)}`,
                menus: allMenus.filter(m => editMenuIds.includes(m.id)).map(m => m.name).join('・'),
            });
            setEditingReservation(null);
            setConflictWarning(null);
            setPendingSave(null);
        } catch (err: any) {
            if (err.response?.status === 409 && err.response?.data?.conflict) {
                setConflictWarning(err.response.data.message);
                setPendingSave({ startStr, endStr, menuRes, reservationId: editingReservation!.id });
            } else {
                throw err;
            }
        }
    };

    // ===== 予定追加 =====
    const saveBlock = async () => {
        if (!showSlotModal) return;
        setSavingBlock(true);
        try {
            const pad = (n: number) => String(n).padStart(2, '0');
            const datePart = showSlotModal.startAt.split('T')[0];
            let startStr: string;
            let endStr: string;
            if (blockDuration === -1) {
                startStr = `${datePart}T${pad(openHour)}:00:00`;
                endStr   = `${datePart}T${pad(closeHour)}:00:00`;
            } else {
                startStr = showSlotModal.startAt;
                const [, timePart] = startStr.split('T');
                const [h, mi] = timePart.split(':').map(Number);
                const totalMin = h * 60 + mi + blockDuration;
                endStr = `${datePart}T${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}:00`;
            }
            const res = await api.post('/api/staff/schedule-blocks', {
                staff_id: showSlotModal.staffId, title: blockTitle, start_at: startStr, end_at: endStr,
            });
            setScheduleBlocks(prev => [...prev, res.data]);
            setShowSlotModal(null);
            setShowBlockModal(false);
            setBlockTitle('予定');
            setBlockDuration(30);
        } catch (err: any) {
            setBlockError(err.response?.data?.message || '予定の追加に失敗しました。');
        } finally {
            setSavingBlock(false);
        }
    };

    // ===== イベントハンドラ =====
    useEffect(() => {
        const urlDate = searchParams.get('date');
        const highlightId = searchParams.get('highlight');
        const refresh = searchParams.get('refresh');
        if (urlDate && urlDate !== date) setDate(urlDate);
        else if (highlightId) fetchData(date, highlightId);
        else if (refresh) fetchData(date);
    }, [searchParams]);

    useEffect(() => { fetchData(date); }, [date]);

    // ===== 描画ヘルパー =====
    const timeToX = (iso: string): number => {
        const jst = toJst(iso);
        const minutes = (jst.getUTCHours() - openHour) * 60 + jst.getUTCMinutes();
        return TIME_LABEL_WIDTH + (minutes / 30) * CELL_WIDTH;
    };

    const widthFromDuration = (start: string, end: string): number => {
        const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
        return Math.max((diff / 30) * CELL_WIDTH, CELL_WIDTH / 2);
    };

    const calcLanes = (reservations: StaffReservation[]): Map<number, number> => {
        const laneMap = new Map<number, number>();
        const lanes: { end: string }[] = [];
        for (const r of reservations) {
            let assigned = false;
            for (let i = 0; i < lanes.length; i++) {
                if (r.start_at >= lanes[i].end) {
                    lanes[i] = { end: r.end_at };
                    laneMap.set(r.id, i);
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                laneMap.set(r.id, lanes.length);
                lanes.push({ end: r.end_at });
            }
        }
        return laneMap;
    };

    // ===== ドラッグハンドラ =====
    const allRows = staffList;
    const reservationsByStaff = (staffId: number) =>
        reservations.filter(r => r.status !== 'cancelled' && r.staff_id === staffId);

    const laneCountMap = new Map<number, number>();
    staffList.forEach(staff => {
        const rowReservations = reservationsByStaff(staff.id);
        const laneMap = calcLanes(rowReservations);
        const laneCount = Math.max(1, new Set(laneMap.values()).size);
        laneCountMap.set(staff.id, laneCount);
    });
    const { didDrag, onReservationDragStart, onBlockMoveDragStart, onBlockResizeDragStart } = useReservationDrag({
        openHour,
        closeHour,
        staffList,
        tableRef,
        laneCountMap,
        setReservations,
        setScheduleBlocks,
        setPendingChange,
        setBlockSuccessMessage,
        setShowBlockMoveSuccess,
        setBlockError,
    });

    const totalWidth = TIME_LABEL_WIDTH + CELL_WIDTH * totalSlots;

    return (
        // ===== タイムテーブル描画 =====
        <StaffGuard>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">予約管理</h1>
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors text-slate-600">◀︎</button>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors text-slate-600">▶︎</button>
                        </div>
                        <Link href="/staff/reservations/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">＋ 予約追加</Link>
                    </div>
                </div>

                {closureInfo?.closed ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center">
                        {closureInfo.reason === 'closed' ? (
                            <div><p className="text-5xl mb-3">🚫</p><p className="text-slate-700 font-bold text-lg">定休日</p><p className="text-slate-400 text-sm mt-1">この日はお休みです</p></div>
                        ) : (
                            <div><p className="text-5xl mb-3">⛔</p><p className="text-slate-700 font-bold text-lg">予約停止日</p><p className="text-slate-400 text-sm mt-1">この日は予約を停止しています</p></div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">読み込み中...</div>
                        ) : (
                            <div ref={tableRef} className="overflow-x-auto select-none">
                                <div style={{ width: totalWidth, minWidth: totalWidth }}>
                                    <div className="flex border-b border-slate-200 bg-slate-50" style={{ height: 40 }}>
                                        <div style={{ width: TIME_LABEL_WIDTH }} className="shrink-0 border-r border-slate-200" />
                                        {Array.from({ length: totalSlots }).map((_, i) => (
                                            <div key={i} style={{ width: CELL_WIDTH }} className="shrink-0 border-r border-slate-200 flex items-center px-2">
                                                <span className="text-xs text-slate-500">{`${openHour + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {allRows.map((staff, rowIdx) => {
                                        const rowReservations = reservationsByStaff(staff.id);
                                        const laneMap = calcLanes(rowReservations);
                                        const laneCount = Math.max(1, new Set(laneMap.values()).size);
                                        const rowHeight = ROW_HEIGHT * laneCount;
                                        const isOff = shiftMap?.[staff.id]?.[date] === false;

                                        return (
                                            <div key={staff.id} className={`flex border-b border-slate-100 relative ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`} style={{ height: rowHeight }}>
                                                <div style={{ width: TIME_LABEL_WIDTH }} className="shrink-0 border-r border-slate-200 flex items-center px-2">
                                                    <div>
                                                        <span className="text-xs font-medium text-slate-600 truncate">{staff.name}</span>
                                                        {isOff && <span className="ml-1 text-xs text-slate-400 bg-slate-100 px-1 rounded">休</span>}
                                                    </div>
                                                </div>

                                                {Array.from({ length: totalSlots }).map((_, i) => {
                                                    const hour = openHour + Math.floor(i / 2);
                                                    const min = i % 2 === 0 ? 0 : 30;
                                                    const pad = (n: number) => String(n).padStart(2, '0');
                                                    const slotTime = `${date}T${pad(hour)}:${pad(min)}:00`;
                                                    return (
                                                        <div
                                                            key={i}
                                                            style={{ width: CELL_WIDTH }}
                                                            className={`shrink-0 border-r ${i % 2 === 0 ? 'border-slate-200' : 'border-slate-100'} ${isOff ? 'bg-slate-100' : 'hover:bg-blue-50/30 cursor-pointer'} transition-colors`}
                                                            onClick={() => {
                                                                if (!isOff) {
                                                                    setShowSlotModal({ staffId: staff.id, startAt: slotTime });
                                                                    setBlockTitle('予定');
                                                                    setBlockDuration(30);
                                                                    setShowBlockModal(false);
                                                                }
                                                            }}
                                                        />
                                                    );
                                                })}

                                                {rowReservations.map(r => {
                                                    const left  = timeToX(r.start_at);
                                                    const width = widthFromDuration(r.start_at, r.end_at);
                                                    const color = getReservationColor(r);
                                                    const total = r.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0);
                                                    const lane  = laneMap.get(r.id) ?? 0;
                                                    const top   = lane * ROW_HEIGHT + 4;
                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className={`absolute rounded-lg border-2 cursor-grab active:cursor-grabbing overflow-hidden shadow-sm z-20 ${color}`}
                                                            style={{ left, width, top, height: ROW_HEIGHT - 8 }}
                                                            onMouseDown={e => onReservationDragStart(e, r, 'move')}
                                                            onClick={() => { if (!didDrag.current) setSelectedReservation(r); }}
                                                        >
                                                            <div className="px-2 py-1 h-full flex flex-col justify-between pointer-events-none">
                                                                <div>
                                                                    <div className="flex items-center gap-1">
                                                                        {!!r.is_nominated && <span className="shrink-0 text-xs bg-blue-500 text-white px-1 rounded font-medium leading-tight">指名</span>}
                                                                        <p className="text-xs font-bold truncate leading-tight">{r.user.name}</p>
                                                                    </div>
                                                                    <p className="text-xs truncate leading-tight">{r.menus.map(m => m.name).join('・')}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`text-xs ${r.type === 'next' ? 'text-blue-600 bg-cyan-100 px-1 rounded font-medium' : 'text-slate-500'}`}>{TYPE_LABEL[r.type]}</span>
                                                                    <span className="text-slate-500 text-xs">·</span>
                                                                    <span className="text-slate-500 text-xs">¥{total.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center pointer-events-auto" onMouseDown={e => { e.stopPropagation(); onReservationDragStart(e, r, 'resize'); }}>
                                                                <div className="w-1 h-6 bg-slate-400/50 rounded-full" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {scheduleBlocks.filter(b => b.staff_id === staff.id).map(b => {
                                                    const left  = timeToX(b.start_at);
                                                    const width = widthFromDuration(b.start_at, b.end_at);
                                                    return (
                                                        <div
                                                            key={`block-${b.id}`}
                                                            className="absolute top-2 bottom-2 rounded-lg bg-slate-200 border-2 border-slate-300 overflow-hidden opacity-80 cursor-grab active:cursor-grabbing z-10"
                                                            style={{ left, width }}
                                                            onMouseDown={e => onBlockMoveDragStart(e, b, api)}
                                                            onClick={() => {
                                                                if (!didDrag.current) {
                                                                    setEditingBlock(b);
                                                                    setEditBlockTitle(b.title);
                                                                    setEditBlockDuration((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60000);
                                                                }
                                                            }}
                                                        >
                                                            <div className="px-2 py-1 pointer-events-none h-full flex flex-col justify-between">
                                                                <p className="text-xs font-medium text-slate-500 truncate">{b.title}</p>
                                                            </div>
                                                            <div
                                                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                                                onMouseDown={e => onBlockResizeDragStart(e, b, api)}
                                                            >
                                                                <div className="w-1 h-6 bg-slate-400/50 rounded-full" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== モーダル & トースト ===== */}
                {/* トースト */}
                {showBlockMoveSuccess && (
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
                        <div className="bg-blue-500 text-white px-8 py-4 rounded-xl shadow-2xl text-sm font-medium">✓ {blockSuccessMessage}</div>
                    </div>
                )}

                {errorMessage && (
                    <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
                )}

                {/* モーダル群 */}
                {selectedReservation && (
                    <ReservationDetailModal
                        reservation={selectedReservation}
                        date={date}
                        closedDates={closedDates}
                        onClose={() => setSelectedReservation(null)}
                        onEdit={() => {
                            setEditingReservation(selectedReservation);
                            setEditMenuIds(selectedReservation.menus.map(m => m.id));
                            setNewStartAt(toLocalDatetimeInput(selectedReservation.start_at));
                            setEditIsNominated(!!selectedReservation.is_nominated);
                            setEditStaffId(selectedReservation.staff_id);
                            setEditType(selectedReservation.type);
                            setSelectedReservation(null);
                            Promise.all([api.get('/api/staff/menus'), api.get('/api/staff/members')])
                                .then(([menusRes, staffRes]) => { setAllMenus(menusRes.data); setStaffListForEdit(staffRes.data); });
                        }}
                        onCancel={() => { setPendingCancel(selectedReservation); setSelectedReservation(null); }}
                        getJstDateString={getJstDateString}
                        formatTime={formatTime}
                    />
                )}

                {pendingCancel && (
                    <CancelConfirmModal
                        reservation={pendingCancel}
                        onClose={() => setPendingCancel(null)}
                        onConfirm={async () => {
                            try {
                                await api.patch(`/api/staff/reservations/${pendingCancel.id}`, { status: 'cancelled' });
                                setReservations(prev => prev.map(r => r.id === pendingCancel.id ? { ...r, status: 'cancelled' } : r));
                                setBlockSuccessMessage('予約をキャンセルしました');
                                setShowBlockMoveSuccess(true);
                                setTimeout(() => setShowBlockMoveSuccess(false), 1000);
                            } catch { setErrorMessage('キャンセルに失敗しました。'); }
                            finally { setPendingCancel(null); }
                        }}
                        formatTime={formatTime}
                    />
                )}

                {pendingChange && (
                    <PendingChangeModal
                        newStart={pendingChange.newStart}
                        newEnd={pendingChange.newEnd}
                        newStaffId={pendingChange.newStaffId}
                        originalStaffId={pendingChange.originalStaffId}
                        staffList={staffList}
                        onClose={() => {
                            setReservations(prev => prev.map(r =>
                                r.id === pendingChange.reservationId ? { ...r, start_at: pendingChange.originalStart, end_at: pendingChange.originalEnd, staff_id: pendingChange.originalStaffId,} : r,
                            ));
                            setPendingChange(null);
                        }}
                        onConfirm={async () => {
                            try {
                                const res = await api.patch(`/api/staff/reservations/${pendingChange.reservationId}`, {
                                    status: reservations.find(r => r.id === pendingChange.reservationId)?.status,
                                    start_at: pendingChange.newStart,
                                    end_at: pendingChange.newEnd,
                                    staff_id: pendingChange.newStaffId,
                                });
                                setReservations(prev => prev.map(r =>
                                    r.id === pendingChange.reservationId ? { ...r, start_at: res.data.start_at, end_at: res.data.end_at } : r
                                ));
                                setBlockSuccessMessage('予約を変更しました');
                                setShowBlockMoveSuccess(true);
                                setTimeout(() => setShowBlockMoveSuccess(false), 1000);
                            } catch (err: any) {
                                setReservations(prev => prev.map(r =>
                                    r.id === pendingChange.reservationId ? { ...r, start_at: pendingChange.originalStart, end_at: pendingChange.originalEnd } : r
                                ));
                                if (err.response?.data?.conflict) {
                                    setDragConflict({ newStart: pendingChange.newStart, newEnd: pendingChange.newEnd, reservationId: pendingChange.reservationId, status: reservations.find(r => r.id === pendingChange.reservationId)?.status ?? 'confirmed' });
                                } else {
                                    setDragError(err.response?.data?.message || '変更に失敗しました。');
                                }
                            } finally { setPendingChange(null); }
                        }}
                    />
                )}

                {dragConflict && (
                    <DragConflictModal
                        onClose={() => setDragConflict(null)}
                        onForce={async () => {
                            try {
                                const res = await api.patch(`/api/staff/reservations/${dragConflict.reservationId}`, {
                                    status: dragConflict.status, start_at: dragConflict.newStart, end_at: dragConflict.newEnd, force: true,
                                });
                                setReservations(prev => prev.map(r => r.id === dragConflict.reservationId ? { ...r, start_at: res.data.start_at, end_at: res.data.end_at } : r));
                            } catch { setDragError('変更に失敗しました。'); }
                            finally { setDragConflict(null); }
                        }}
                    />
                )}

                {dragError && <DragErrorModal message={dragError} onClose={() => setDragError(null)} />}

                {showEditSuccess && (
                    <EditSuccessModal
                        date={showEditSuccess.date}
                        time={showEditSuccess.time}
                        menus={showEditSuccess.menus}
                        onClose={() => setShowEditSuccess(null)}
                    />
                )}

                {conflictWarning && pendingSave && (
                    <ConflictWarningModal
                        message={conflictWarning}
                        saving={saving}
                        onClose={() => {
                            setReservations(prev => prev.map(r =>
                                r.id === pendingSave.reservationId
                                    ? { ...r, start_at: editingReservation?.start_at ?? r.start_at, end_at: editingReservation?.end_at ?? r.end_at }
                                    : r
                            ));
                            setConflictWarning(null);
                            setPendingSave(null);
                        }}
                        onForce={async () => {
                            setSaving(true);
                            try {
                                const dateRes = await api.patch(`/api/staff/reservations/${pendingSave.reservationId}`, {
                                    start_at: pendingSave.startStr, end_at: pendingSave.endStr,
                                    is_nominated: editIsNominated, staff_id: editStaffId, force: true,
                                });
                                setReservations(prev => prev.map(r =>
                                    r.id === editingReservation?.id ? { ...r, start_at: dateRes.data.start_at, end_at: dateRes.data.end_at, is_nominated: editIsNominated, staff_id: editStaffId } : r
                                ));
                                const [datePart, timePart] = pendingSave.startStr.split('T');
                                const [h, mi] = timePart.split(':').map(Number);
                                const pad = (n: number) => String(n).padStart(2, '0');
                                setShowEditSuccess({
                                    date: `${datePart.slice(0,4)}年${parseInt(datePart.slice(5,7))}月${parseInt(datePart.slice(8,10))}日`,
                                    time: `${pad(h)}:${pad(mi)}`,
                                    menus: allMenus.filter(m => editMenuIds.includes(m.id)).map(m => m.name).join('・'),
                                });
                                setEditingReservation(null);
                                setConflictWarning(null);
                                setPendingSave(null);
                            } finally { setSaving(false); }
                        }}
                    />
                )}

                {showSlotModal && !showBlockModal && (
                    <SlotModal
                        startAt={showSlotModal.startAt}
                        staffName={staffList.find(s => s.id === showSlotModal.staffId)?.name ?? ''}
                        onClose={() => setShowSlotModal(null)}
                        onAddReservation={() => {
                            const startAt = showSlotModal.startAt;
                            setShowSlotModal(null);
                            window.location.href = `/staff/reservations/new?start_at=${encodeURIComponent(startAt)}&staff_id=${showSlotModal.staffId}`;
                        }}
                        onAddBlock={() => setShowBlockModal(true)}
                    />
                )}

                {showSlotModal && showBlockModal && (
                    <BlockModal
                        startAt={showSlotModal.startAt}
                        staffName={staffList.find(s => s.id === showSlotModal.staffId)?.name ?? ''}
                        blockTitle={blockTitle}
                        blockDuration={blockDuration}
                        openHour={openHour}
                        closeHour={closeHour}
                        saving={savingBlock}
                        onClose={() => { setShowBlockModal(false); setShowSlotModal(null); }}
                        onBack={() => setShowBlockModal(false)}
                        onSave={saveBlock}
                        setBlockTitle={setBlockTitle}
                        setBlockDuration={setBlockDuration}
                    />
                )}

                {editingBlock && (
                    <EditBlockModal
                        block={editingBlock}
                        editBlockTitle={editBlockTitle}
                        editBlockDuration={editBlockDuration}
                        openHour={openHour}
                        closeHour={closeHour}
                        saving={savingBlockEdit}
                        onClose={() => setEditingBlock(null)}
                        onDelete={async () => {
                            await api.delete(`/api/staff/schedule-blocks/${editingBlock.id}`);
                            setScheduleBlocks(prev => prev.filter(b => b.id !== editingBlock.id));
                            setEditingBlock(null);
                            setBlockSuccessMessage('予定を削除しました');
                            setShowBlockMoveSuccess(true);
                            setTimeout(() => setShowBlockMoveSuccess(false), 1000);
                        }}
                        onSave={async () => {
                            setSavingBlockEdit(true);
                            try {
                                const jstStart = toJst(editingBlock.start_at);
                                const pad = (n: number) => String(n).padStart(2, '0');
                                const dateStr = `${jstStart.getUTCFullYear()}-${pad(jstStart.getUTCMonth()+1)}-${pad(jstStart.getUTCDate())}`;
                                const h = jstStart.getUTCHours();
                                const mi = jstStart.getUTCMinutes();
                                const startAt = editBlockDuration === -1 ? `${dateStr}T${pad(openHour)}:00:00` : `${dateStr}T${pad(h)}:${pad(mi)}:00`;
                                const endAt   = editBlockDuration === -1 ? `${dateStr}T${pad(closeHour)}:00:00` : `${dateStr}T${pad(Math.floor((h * 60 + mi + editBlockDuration) / 60))}:${pad((h * 60 + mi + editBlockDuration) % 60)}:00`;
                                const res = await api.patch(`/api/staff/schedule-blocks/${editingBlock.id}`, { title: editBlockTitle, start_at: startAt, end_at: endAt });
                                setScheduleBlocks(prev => prev.map(b => b.id === editingBlock.id ? { ...b, title: res.data.title, start_at: res.data.start_at, end_at: res.data.end_at } : b));
                                setEditingBlock(null);
                                setBlockSuccessMessage('予定を変更しました');
                                setShowBlockMoveSuccess(true);
                                setTimeout(() => setShowBlockMoveSuccess(false), 1000);
                            } catch (err: any) {
                                setBlockError(err.response?.data?.message || '予定の変更に失敗しました。');
                            } finally { setSavingBlockEdit(false); }
                        }}
                        setEditBlockTitle={setEditBlockTitle}
                        setEditBlockDuration={setEditBlockDuration}
                    />
                )}

                {blockError && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] px-4" onClick={() => setBlockError(null)}>
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">⚠️ 追加できません</h2>
                            <p className="text-slate-600 text-sm mb-6">{blockError}</p>
                            <button onClick={() => setBlockError(null)} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">閉じる</button>
                        </div>
                    </div>
                )}

                {editingReservation && (
                    <EditReservationModal
                        reservation={editingReservation}
                        newStartAt={newStartAt}
                        editMenuIds={editMenuIds}
                        editIsNominated={editIsNominated}
                        editStaffId={editStaffId}
                        allMenus={allMenus}
                        staffList={staffListForEdit}
                        saving={saving}
                        editError={editError}
                        onClose={() => { setEditingReservation(null); setEditError(null); }}
                        editType={editType}
                        setEditType={setEditType}
                        onSave={async () => {
                            setSaving(true);
                            try {
                                const menuRes = await api.put(`/api/staff/reservations/${editingReservation.id}/menus`, { menu_ids: editMenuIds });
                                const duration = allMenus.filter(m => editMenuIds.includes(m.id)).reduce((sum, m) => sum + m.duration_minutes, 0);
                                const [datePart, timePart] = newStartAt.split('T');
                                const [h, mi] = timePart.split(':').map(Number);
                                const totalMinutes = h * 60 + mi + duration;
                                const pad = (n: number) => String(n).padStart(2, '0');
                                const startStr = `${datePart}T${pad(h)}:${pad(mi)}:00`;
                                const endStr   = `${datePart}T${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}:00`;
                                await saveDateTime(startStr, endStr, menuRes, false);
                            } catch (err: any) {
                                if (!(err.response?.status === 409 && err.response?.data?.conflict)) {
                                    setEditError(err.response?.data?.message || '変更に失敗しました。');
                                }
                            } finally { setSaving(false); }
                        }}
                        setNewStartAt={setNewStartAt}
                        setEditMenuIds={setEditMenuIds}
                        setEditIsNominated={setEditIsNominated}
                        setEditStaffId={setEditStaffId}
                    />
                )}
            </div>
        </StaffGuard>
    );
}

export default function StaffReservationsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-slate-500">読み込み中...</div>}>
            <StaffReservationsContent />
        </Suspense>
    );
}
