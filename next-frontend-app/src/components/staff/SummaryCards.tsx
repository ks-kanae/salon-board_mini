type Props = {
    confirmed: number;
    completed: number;
    unchecked: number;
    totalSales: number;
    isToday: boolean;
};

export default function SummaryCards({
    confirmed,
    completed,
    unchecked,
    totalSales,
    isToday,
}: Props) {
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-400">
                <p className="text-slate-500 text-sm mb-1">確定中</p>
                <p className="text-3xl font-bold text-slate-800">
                    {confirmed}
                </p>
            </div>

            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-400">
                <p className="text-slate-500 text-sm mb-1">施術完了</p>
                <p className="text-3xl font-bold text-slate-800">
                    {completed}
                </p>
            </div>

            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-400">
                <p className="text-slate-500 text-sm mb-1">未会計</p>
                <p className="text-3xl font-bold text-slate-800">
                    {unchecked}
                </p>
            </div>

            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-400">
                <p className="text-slate-500 text-sm mb-1">
                    {isToday ? "本日売上" : "売上"}
                </p>

                <p className="text-xl font-bold text-slate-800">
                    ¥{totalSales.toLocaleString()}
                </p>
            </div>
        </div>
    );
}
