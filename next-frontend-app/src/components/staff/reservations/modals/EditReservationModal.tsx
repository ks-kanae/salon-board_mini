"use client";

import { StaffReservation } from "@/types/reservation";

type Menu = { id: number; name: string; price: number; duration_minutes: number };
type Staff = { id: number; name: string };

type Props = {
    reservation: StaffReservation;
    newStartAt: string;
    editMenuIds: number[];
    editIsNominated: boolean;
    editStaffId: number | null;
    editType: 'online' | 'manual' | 'next';
    allMenus: Menu[];
    staffList: Staff[];
    saving: boolean;
    editError: string | null;
    onClose: () => void;
    onSave: () => void;
    setNewStartAt: (v: string) => void;
    setEditMenuIds: (fn: (prev: number[]) => number[]) => void;
    setEditIsNominated: (v: boolean) => void;
    setEditStaffId: (v: number | null) => void;
    setEditType: (v: 'online' | 'manual' | 'next') => void;
};

export default function EditReservationModal({
    reservation, newStartAt, editMenuIds, editIsNominated, editStaffId, editType,
    allMenus, staffList, saving, editError, onClose, onSave,
    setNewStartAt, setEditMenuIds, setEditIsNominated, setEditStaffId, setEditType,
}: Props) {
    const isOnline = reservation.type === 'online';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold text-slate-800">予約を変更</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <p className="text-slate-500 text-sm mb-5">{reservation.user.name}さんの予約</p>

                {editError && (
                    <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {editError}
                    </div>
                )}

                <div className="mb-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">📅 予約日時</h3>
                    <input
                        type="datetime-local"
                        value={newStartAt}
                        onChange={e => setNewStartAt(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">※ 所要時間は変わりません（メニュー変更で自動計算されます）</p>
                </div>

                {/* 予約種別（ネット予約以外のみ変更可） */}
                {!isOnline && (
                    <div className="mb-5">
                        <h3 className="text-sm font-bold text-slate-700 mb-2">📌 予約種別</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditType('manual')}
                                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                    editType === 'manual'
                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-slate-600 hover:border-gray-300'
                                }`}
                            >
                                電話予約
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditType('next')}
                                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                                    editType === 'next'
                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-slate-600 hover:border-gray-300'
                                }`}
                            >
                                次回予約
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-5">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">👤 担当・指名</h3>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={editIsNominated}
                                onChange={e => setEditIsNominated(e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-sm text-slate-600">指名</span>
                        </label>
                        <select
                            value={editStaffId ?? ''}
                            onChange={e => setEditStaffId(Number(e.target.value))}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">📋 メニュー</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {allMenus.map(menu => {
                            const selected = editMenuIds.includes(menu.id);
                            return (
                                <button
                                    key={menu.id}
                                    type="button"
                                    onClick={() => setEditMenuIds(prev =>
                                        prev.includes(menu.id) ? prev.filter(id => id !== menu.id) : [...prev, menu.id]
                                    )}
                                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
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
                    {editMenuIds.length > 0 && (
                        <div className="mt-3 bg-blue-50 rounded-lg p-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">
                                    選択中 {editMenuIds.length}件・{allMenus.filter(m => editMenuIds.includes(m.id)).reduce((sum, m) => sum + m.duration_minutes, 0)}分
                                </span>
                                <span className="font-bold text-slate-800">
                                    ¥{allMenus.filter(m => editMenuIds.includes(m.id)).reduce((sum, m) => sum + m.price, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">キャンセル</button>
                    <button
                        disabled={editMenuIds.length === 0 || !newStartAt || saving}
                        onClick={onSave}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '変更を保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
