"use client";

type Props = {
    date: string;
    time: string;
    menus: string;
    onClose: () => void;
};

export default function EditSuccessModal({ date, time, menus, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <div className="text-4xl text-blue-500 mb-3">✔︎</div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4">予約を変更しました</h2>
                    <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">日付</span>
                            <span className="font-medium text-slate-800">{date}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">開始時刻</span>
                            <span className="font-medium text-slate-800">{time}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">メニュー</span>
                            <span className="font-medium text-slate-800 text-right max-w-[60%]">{menus}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">閉じる</button>
                </div>
            </div>
        </div>
    );
}
