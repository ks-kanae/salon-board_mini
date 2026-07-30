"use client";

type Props = {
    startAt: string;
    staffName: string;
    onClose: () => void;
    onAddReservation: () => void;
    onAddBlock: () => void;
};

export default function SlotModal({ startAt, staffName, onClose, onAddReservation, onAddBlock }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-slate-800 mb-1">
                    {startAt.split('T')[1].slice(0, 5)} からの時間枠
                </h2>
                <p className="text-slate-500 text-sm mb-5">{staffName}</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onAddReservation} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        ＋ 予約を追加
                    </button>
                    <button onClick={onAddBlock} className="w-full py-3 border-2 border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">
                        📅 予定を追加
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-3 py-2 text-slate-400 hover:text-slate-600 text-sm">キャンセル</button>
            </div>
        </div>
    );
}
