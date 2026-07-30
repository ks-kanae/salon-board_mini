"use client";

type Props = {
    startAt: string;
    staffName: string;
    blockTitle: string;
    blockDuration: number;
    openHour: number;
    closeHour: number;
    saving: boolean;
    onClose: () => void;
    onBack: () => void;
    onSave: () => void;
    setBlockTitle: (v: string) => void;
    setBlockDuration: (v: number) => void;
};

export default function BlockModal({
    startAt, staffName, blockTitle, blockDuration, openHour, closeHour,
    saving, onClose, onBack, onSave, setBlockTitle, setBlockDuration,
}: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-800">予定を追加</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">タイトル</label>
                        <input
                            type="text"
                            value={blockTitle}
                            onChange={e => setBlockTitle(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">所要時間</label>
                        <select
                            value={blockDuration}
                            onChange={e => setBlockDuration(Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {[30, 60, 90, 120, 150, 180, 210, 240].map(m => (
                                <option key={m} value={m}>{m}分</option>
                            ))}
                            <option value={-1}>終日（{openHour}:00〜{closeHour}:00）</option>
                        </select>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                        {blockDuration === -1 ? (
                            <p>開始：{String(openHour).padStart(2, '0')}:00〜{String(closeHour).padStart(2, '0')}:00（終日）</p>
                        ) : (
                            <p>開始：{startAt.split('T')[1].slice(0, 5)}</p>
                        )}
                        <p>担当：{staffName}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onBack} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">戻る</button>
                    <button onClick={onSave} disabled={saving || !blockTitle} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {saving ? '保存中...' : '追加する'}
                    </button>
                </div>
            </div>
        </div>
    );
}
