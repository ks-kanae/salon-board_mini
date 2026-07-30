import { DashboardData, SalesSummary } from "@/types/reservation";
import Link from "next/link";
import SummaryCards from "./SummaryCards";
import { Dispatch, SetStateAction } from "react";

type Props = {
    closingData: DashboardData | null;
    salesSummary: SalesSummary | null;
    closingLoading: boolean;

    selectedDate: string;
    today: string;

    year: number;
    month: number;
    day: number;

    unchecked: number;

    closingMemo: string;
    setClosingMemo: (value: string) => void;

    showClosingModal: boolean;
    setShowClosingModal: (value: boolean) => void;

    closing: boolean;

    handleClosing: () => void;

    confirmed: number;
    completed: number;

    weekday: string;

    setSelectedDate: Dispatch<SetStateAction<string>>;
};

export default function ClosingSection({
    closingData,
    salesSummary,
    closingLoading,
    selectedDate,
    today,
    year,
    month,
    day,
    unchecked,
    closingMemo,
    setClosingMemo,
    showClosingModal,
    setShowClosingModal,
    closing,
    handleClosing,
    confirmed,
    completed,
    weekday,
    setSelectedDate,
}: Props) {

const isToday = selectedDate === today;
const changeDate = (diff: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + diff);

    const next = d.toISOString().split("T")[0];

    if (next <= today) {
        setSelectedDate(next);
    }
};

    return (
        <>
        {showClosingModal && closingData && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                onClick={() => setShowClosingModal(false)}
            >
                <div
                    className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
                    onClick={e => e.stopPropagation()}
                >
                    <h2 className="text-lg font-bold text-slate-800 mb-1">レジ締めを実行しますか？</h2>
                    <p className="text-slate-500 text-sm mb-5">
                        締め後は会計修正ができなくなります。
                    </p>

                    <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">対象日</span>
                            <span className="font-medium text-slate-800">
                                {`${selectedDate.slice(0, 4)}年${selectedDate.slice(5, 7)}月${selectedDate.slice(8, 10)}日`}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">会計件数</span>
                            <span className="font-medium text-slate-800">{closingData.total_count}件</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2 mt-1">
                            <span className="text-slate-700">
                                {isToday ? "本日の売上合計" : "売上合計"}
                            </span>
                            <span className="text-blue-600 text-lg">¥{closingData.total_sales.toLocaleString()}</span>
                        </div>
                    </div>

                    {unchecked > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                            <p className="text-orange-700 text-sm font-medium">
                                ⚠️ 未会計の予約が{unchecked}件あります
                            </p>
                            <p className="text-orange-600 text-xs mt-1">
                                未会計のまま締めると売上に含まれません。
                            </p>
                        </div>
                    )}

                    <div className="mb-5">
                        <label className="text-xs font-medium text-slate-600 mb-1 block">メモ（任意）</label>
                        <input
                            type="text"
                            value={closingMemo}
                            onChange={e => setClosingMemo(e.target.value)}
                            placeholder="特記事項など"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowClosingModal(false)}
                            className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleClosing}
                            disabled={closing}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            {closing ? '処理中...' : 'レジ締めを実行'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => changeDate(-1)}
                            className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500"
                        >◀︎</button>
                        <p className="text-slate-500 text-lg">
                            {`${year}年${month}月${day}日（${weekday}曜日）`}
                            {isToday && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                    今日
                                </span>
                            )}
                        </p>
                        <button
                            onClick={() => changeDate(1)}
                            disabled={isToday}
                            className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-500 disabled:opacity-30"
                        >▶︎</button>
                    </div>
                </div>
                <Link
                    href="/staff/reservations/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    ＋ 予約追加
                </Link>
            </div>

            {/* サマリーカード */}
            <SummaryCards
                confirmed={confirmed}
                completed={completed}
                unchecked={unchecked}
                totalSales={salesSummary?.total_sales ?? 0}
                isToday={isToday}
            />

            {/* レジ締めセクション */}
            <div className={`rounded-xl shadow p-5 ${closingData?.is_closed ? 'bg-slate-100' : 'bg-white'}`}>
                <h2 className="font-bold text-slate-800 mb-3">
                    {isToday
                        ? "本日のレジ締め"
                        : `${year}年${month}月${day}日のレジ締め`}
                </h2>
                {closingLoading ? (
                    <p className="text-slate-400 text-sm">確認中...</p>
                ) : closingData?.is_closed ? (
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-green-600 text-lg font-medium">
                                ✔︎ {isToday
                                    ? "本日のレジ締め完了"
                                    : "レジ締め完了"}
                            </p>
                            <p className="text-slate-500 text-sm">
                                {new Date(closingData.closing?.closed_at ?? '').toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })} に完了
                            </p>
                        </div>
                        <div className="border-t pt-3 space-y-1">
                            <div className="flex justify-between font-bold text-base pb-2 border-b">
                                <span className="text-slate-700">{isToday
                                ? "本日売上合計"
                                : "売上合計"}</span>
                                <span className="text-blue-600">¥{salesSummary?.total_sales.toLocaleString() ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1">
                                <span className="text-slate-500">　現金</span>
                                <span className="text-slate-800">¥{salesSummary?.breakdown?.cash.toLocaleString() ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">　クレジット</span>
                                <span className="text-slate-800">¥{salesSummary?.breakdown?.credit.toLocaleString() ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">　キャッシュレス</span>
                                <span className="text-slate-800">¥{salesSummary?.breakdown?.cashless.toLocaleString() ?? 0}</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs text-right mt-2">
                            ※ レジ締め後に行った会計は翌営業日の売上へ自動計上されます。
                        </p>
                        {closingData.closing?.memo && (
                            <p className="text-slate-500 text-xs mt-1">メモ：{closingData.closing.memo}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* 売上合計：全幅 */}
                        <div className="flex justify-between font-bold text-base mb-3 pb-2 border-b border-slate-200">
                            <span className="text-slate-700">
                                {isToday ? "本日の売上合計" : "売上合計"}
                            </span>
                            <span className="text-blue-600 text-lg">
                                ¥{salesSummary?.total_sales.toLocaleString() ?? 0}
                            </span>
                        </div>

                        {/* 内訳＋ボタン：横並び */}
                        <div className="flex items-end justify-between gap-4">
                            <div className="space-y-1.5 min-w-0">
                                <p className="text-sm font-medium text-slate-500">支払い方法別内訳</p>
                                <div className="flex justify-between gap-20 ">
                                    <span className="text-slate-500">現金</span>
                                    <span className="text-slate-800">¥{salesSummary?.breakdown?.cash.toLocaleString() ?? 0}</span>
                                </div>
                                <div className="flex justify-between gap-20 ">
                                    <span className="text-slate-500">クレジット</span>
                                    <span className="text-slate-800">¥{salesSummary?.breakdown?.credit.toLocaleString() ?? 0}</span>
                                </div>
                                <div className="flex justify-between gap-20 ">
                                    <span className="text-slate-500">キャッシュレス</span>
                                    <span className="text-slate-800">¥{salesSummary?.breakdown?.cashless.toLocaleString() ?? 0}</span>
                                </div>
                            </div>

                            {/* レジ締めボタン（右側・内訳の右に縦中央） */}
                            {!closingData?.is_closed && !closingLoading && isToday && (
                                <button
                                    onClick={() => setShowClosingModal(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                    レジ締めする
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>

    );
}
