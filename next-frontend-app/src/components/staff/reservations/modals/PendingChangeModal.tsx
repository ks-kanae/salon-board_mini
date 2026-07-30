type Props = {
    newStart: string;
    newEnd: string;
    newStaffId: number | null;
    originalStaffId: number | null;
    staffList: { id: number; name: string }[];
    onClose: () => void;
    onConfirm: () => void;
};

export default function PendingChangeModal({ newStart, newEnd, newStaffId, originalStaffId, staffList, onClose, onConfirm }: Props) {
    const newStaffName = staffList.find(s => s.id === newStaffId)?.name ?? '';
    const staffChanged = newStaffId !== originalStaffId;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
                <h2 className="text-lg font-bold text-slate-800 mb-2">予約を変更しますか？</h2>
                <p className="text-slate-500 text-sm mb-1">
                    {new Date(newStart).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    〜 {new Date(newEnd).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}に変更します。
                </p>
                {staffChanged && (
                    <p className="text-blue-600 text-sm mb-4">担当：{newStaffName}に変更</p>
                )}
                <div className="flex gap-3 mt-4">
                    <button onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">キャンセル</button>
                    <button onClick={onConfirm} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">変更する</button>
                </div>
            </div>
        </div>
    );
}
