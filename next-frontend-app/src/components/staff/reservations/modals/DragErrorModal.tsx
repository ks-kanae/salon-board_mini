"use client";

type Props = {
    message: string;
    onClose: () => void;
};

export default function DragErrorModal({ message, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold text-slate-800 mb-2">⚠️ 変更できません</h2>
                <p className="text-slate-600 text-sm mb-6">{message}</p>
                <button onClick={onClose} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">閉じる</button>
            </div>
        </div>
    );
}
