"use client";

import { ScheduleBlock } from "@/types/reservation";
import { toJst } from "@/lib/date";

type Props = {
    block: ScheduleBlock;
    editBlockTitle: string;
    editBlockDuration: number;
    openHour: number;
    closeHour: number;
    saving: boolean;
    onClose: () => void;
    onDelete: () => void;
    onSave: () => void;
    setEditBlockTitle: (v: string) => void;
    setEditBlockDuration: (v: number) => void;
};

export default function EditBlockModal({
    block, editBlockTitle, editBlockDuration, openHour, closeHour,
    saving, onClose, onDelete, onSave, setEditBlockTitle, setEditBlockDuration,
}: Props) {
    const jstStart = toJst(block.start_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = jstStart.getUTCHours();
    const mi = jstStart.getUTCMinutes();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">予定を編集</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">タイトル</label>
                        <input
                            type="text"
                            value={editBlockTitle}
                            onChange={e => setEditBlockTitle(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">所要時間</label>
                        <select
                            value={editBlockDuration}
                            onChange={e => setEditBlockDuration(Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {[30, 60, 90, 120, 150, 180, 210, 240].map(m => (
                                <option key={m} value={m}>{m}分</option>
                            ))}
                            <option value={-1}>終日（{openHour}:00〜{closeHour}:00）</option>
                        </select>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-500">
                        {editBlockDuration === -1 ? (
                            <p>{pad(openHour)}:00〜{pad(closeHour)}:00（終日）</p>
                        ) : (
                            <p>{pad(h)}:{pad(mi)}〜{pad(Math.floor((h * 60 + mi + editBlockDuration) / 60))}:{pad((h * 60 + mi + editBlockDuration) % 60)}</p>
                        )}
                        <p>{block.staff?.name}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onDelete} className="flex-1 py-2 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 text-sm">削除する</button>
                    <button onClick={onSave} disabled={saving || !editBlockTitle} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {saving ? '保存中...' : '保存する'}
                    </button>
                </div>
            </div>
        </div>
    );
}
