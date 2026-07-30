"use client";

type Props = {
    onClose: () => void;
    onForce: () => void;
};

export default function DragConflictModal({ onClose, onForce }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                <h2 className="text-lg font-bold text-slate-800 mb-2">⚠️ 予約が重複しています</h2>
                <p className="text-slate-600 text-sm mb-6">この日時には他の予約が入っています。変更しますか？</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">戻る</button>
                    <button onClick={onForce} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">それでも変更する</button>
                </div>
            </div>
        </div>
    );
}
