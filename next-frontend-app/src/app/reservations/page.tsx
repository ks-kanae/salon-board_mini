"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/lib/auth-context";
import Toast from "@/components/Toast";

type Salon = {
    id: number;
    name: string;
    category: 'eyelash' | 'nail' | 'hair';
    address: string;
    phone: string;
    open_hour: number;
    close_hour: number;
};

type Menu = {
    id: number;
    name: string;
    pivot: { price_at_booking: number };
};

type Reservation = {
    id: number;
    salon: Salon;
    start_at: string;
    end_at: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type: 'online' | 'manual' | 'next';
    notes: string | null;
    is_nominated: boolean;
    staff: { id: number; name: string } | null;
    menus: Menu[];
};

const statusLabel: Record<Reservation['status'], string> = {
    pending: '予約受付中',
    confirmed: '予約確定',
    cancelled: 'キャンセル済み',
    completed: '施術完了',
};

const statusColor: Record<Reservation['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-purple-100 text-purple-600',
    cancelled: 'bg-gray-100 text-gray-500',
    completed: 'bg-blue-100 text-blue-800',
};

const typeLabel: Record<Reservation['type'], string> = {
    online: 'ネット予約',
    manual: '電話予約',
    next: '次回予約',
};

type Tab = 'upcoming' | 'history' | 'cancelled';

export default function ReservationsPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [cancelTarget, setCancelTarget] = useState<number | null>(null);
    const [salonDetail, setSalonDetail] = useState<Salon | null>(null);
    const [tab, setTab] = useState<Tab>('upcoming');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'customer')) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (user?.role === 'customer') {
            api.get("/api/reservations")
                .then(res => setReservations(res.data))
                .finally(() => setLoading(false));
        }
    }, [user]);

    const handleCancel = async () => {
        if (!cancelTarget) return;
        setCancellingId(cancelTarget);
        setCancelTarget(null);
        try {
            await api.patch(`/api/reservations/${cancelTarget}/cancel`);
            setReservations(prev =>
                prev.map(r => r.id === cancelTarget ? { ...r, status: 'cancelled' } : r)
            );
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || "キャンセルに失敗しました。");
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('ja-JP', {
            year: 'numeric', month: 'long', day: 'numeric',
            weekday: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    if (isLoading || loading) {
        return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
    }

    // タブごとの分類
    const upcomingReservations = reservations
        .filter(r => r.status === 'confirmed' || r.status === 'pending')
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const historyReservations = reservations
        .filter(r => r.status === 'completed')
        .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

    // キャンセルはネット予約のみ
    const cancelledReservations = reservations
        .filter(r => r.status === 'cancelled' && r.type === 'online')
        .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

    const tabReservations = {
        upcoming: upcomingReservations,
        history: historyReservations,
        cancelled: cancelledReservations,
    }[tab];

    const ReservationCard = ({ r }: { r: Reservation }) => {
        const totalPrice = r.menus.reduce((sum, m) => sum + m.pivot.price_at_booking, 0);
        const isToday = new Date(r.start_at).toDateString() === new Date().toDateString();
        const now = new Date();
        const isPast = new Date(r.start_at) < now && !isToday;
        const canCancel = r.status !== 'cancelled' && r.status !== 'completed' && !isToday && !isPast;

        return (
            <div className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-semibold text-gray-800">{formatDate(r.start_at)}</p>
                        <p className="text-gray-500 text-sm">
                            〜 {new Date(r.end_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button
                            onClick={() => setSalonDetail(r.salon)}
                            className="text-pink-600 text-lg font-medium mt-1 hover:underline text-left"
                        >
                            📍 {r.salon.name}
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[r.status]}`}>
                            {statusLabel[r.status]}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {typeLabel[r.type]}
                        </span>
                    </div>
                </div>

                <div className="border-t pt-3">
                    {r.menus.map(m => (
                        <div key={m.id} className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{m.name}</span>
                            <span>¥{m.pivot.price_at_booking.toLocaleString()}</span>
                        </div>
                    ))}
                    {/* 担当スタッフ・指名 追加 */}
                    {!!r.is_nominated && r.staff && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t text-sm text-gray-600">
                            <span>担当：{r.staff.name}</span>
                            <span className="text-xs bg-pink-400 text-white px-1.5 py-0.5 rounded-full">指名</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-800 mt-2 pt-2 border-t">
                        <span>合計</span>
                        <span>¥{totalPrice.toLocaleString()}</span>
                    </div>
                </div>

                {r.notes && (
                    <p className="text-gray-500 text-sm mt-3 bg-gray-50 p-2 rounded">
                        備考：{r.notes}
                    </p>
                )}

                {isToday && r.status !== 'cancelled' && r.status !== 'completed' && (
                    <p className="text-red-500 text-sm mt-3">
                        当日のキャンセル・変更はサロンに直接ご連絡ください。
                    </p>
                )}

                {canCancel && (
                    <button
                        onClick={() => setCancelTarget(r.id)}
                        disabled={cancellingId === r.id}
                        className="mt-3 text-red-400 text-sm hover:underline disabled:text-gray-400"
                    >
                        {cancellingId === r.id ? "キャンセル中..." : "キャンセルする"}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">

            {errorMessage && (
                <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}

            {/* キャンセル確認モーダル */}
            {cancelTarget && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setCancelTarget(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-gray-800 mb-2">予約をキャンセルしますか？</h2>
                        <p className="text-gray-500 text-sm mb-6">この操作は取り消せません。</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCancelTarget(null)}
                                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                キャンセルする
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 店舗情報モーダル */}
            {salonDetail && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
                    onClick={() => setSalonDetail(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">{salonDetail.name}</h2>
                            <button onClick={() => setSalonDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <span className="text-gray-400 mt-0.5">📍</span>
                                <span className="text-gray-700">{salonDetail.address}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400">📞</span>
                                <a href={`tel:${salonDetail.phone}`} className="text-pink-600 hover:underline">
                                    {salonDetail.phone}
                                </a>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400">🕐</span>
                                <span className="text-gray-700">{salonDetail.open_hour}:00 〜 {salonDetail.close_hour}:00</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSalonDetail(null)}
                            className="w-full mt-6 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">予約一覧</h1>
                <Link
                    href="/"
                    className="bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors text-sm"
                >
                    新しく予約する
                </Link>
            </div>

            {/* タブ */}
            <div className="flex border-b border-gray-200 mb-6">
                {([
                    { key: 'upcoming',  label: '予約中',    count: upcomingReservations.length },
                    { key: 'history',   label: '来店履歴',  count: historyReservations.length },
                    { key: 'cancelled', label: 'キャンセル', count: cancelledReservations.length },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 py-3 text-base font-medium border-b-2 transition-colors ${
                            tab === t.key
                                ? 'border-pink-500 text-pink-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t.label}
                        {t.count > 0 && (
                            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                                tab === t.key ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* 予約リスト */}
            {tabReservations.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    {tab === 'upcoming' && (
                        <>
                            <p className="text-lg mb-4">予約はまだありません</p>
                            <Link href="/" className="text-rose-400 hover:underline">予約する ↗︎</Link>
                        </>
                    )}
                    {tab === 'history' && <p className="text-lg">来店履歴はありません</p>}
                    {tab === 'cancelled' && <p className="text-lg">キャンセル履歴はありません</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    {tabReservations.map(r => (
                        <ReservationCard key={r.id} r={r} />
                    ))}
                </div>
            )}
        </div>
    );
}
