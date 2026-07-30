"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";
import ClosingSection from "@/components/staff/ClosingSection";
import { DashboardData, SalesSummary } from "@/types/reservation";
import { getJstDateString, formatTime, toJstDateStr } from "@/lib/date";
import Toast from "@/components/Toast";


export default function StaffDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [closingLoading, setClosingLoading] = useState(true);
    const [showClosingModal, setShowClosingModal] = useState(false);
    const [closingMemo, setClosingMemo] = useState('');
    const [closing, setClosing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => getJstDateString());
    const today = getJstDateString();
    const [year, month, day] = selectedDate.split('-').map(Number);
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, day).getDay()];
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchData = async (signal?: AbortSignal) => {
        setLoading(true);
        setClosingLoading(true);
        try {
            const res = await api.get('/api/staff/closing', {
                params: { date: selectedDate },
                signal,
            });
            setData(res.data);
        } catch (err: any) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        } finally {
            setLoading(false);
            setClosingLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [selectedDate]);

    const handleClosing = async () => {
        setClosing(true);
        try {
            await api.post('/api/staff/closing', {
                date: selectedDate,
                memo: closingMemo,
            });
            await fetchData();
            setShowClosingModal(false);
            setClosingMemo('');
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'レジ締めに失敗しました。');
        } finally {
            setClosing(false);
        }
    };

    const todayReservations      = data?.today_reservations ?? [];
    const carryOverReservations  = data?.carry_over_reservations ?? [];
    const afterClosingReservations = data?.after_closing_reservations ?? [];
    const unpaidReservations     = data?.unpaid_reservations ?? [];

    // サマリーカード用集計
    const confirmed = todayReservations.filter(r => r.status === 'confirmed').length;
    const completed = todayReservations.filter(r => r.status === 'completed').length;
    const unchecked = unpaidReservations.filter(r => toJstDateStr(r.start_at) === selectedDate).length;

    const salesSummary: SalesSummary | null = data ? {
        total_sales: data.total_sales,
        total_count: data.total_count,
        breakdown: data.breakdown,
    } : null;

    const methodLabel = (method: string | null) => {
        if (method === 'cash') return '現金';
        if (method === 'credit') return 'クレジット';
        if (method === 'cashless') return 'キャッシュレス';
        return '';
    };

    const dateLabel = (iso: string) =>
        iso.slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${parseInt(m)}月${parseInt(d)}日`);

    return (
        <StaffGuard>
            <ClosingSection
                closingData={data ? {
                    date: data.date,
                    is_closed: data.is_closed,
                    closing: data.closing,
                    prev_closing: data.prev_closing,
                    today_reservations: data.today_reservations,
                    carry_over_reservations: data.carry_over_reservations,
                    after_closing_reservations: data.after_closing_reservations,
                    unpaid_reservations: data.unpaid_reservations,
                    total_sales: data.total_sales,
                    total_count: data.total_count,
                    breakdown: data.breakdown,
                } : null}
                salesSummary={salesSummary}
                closingLoading={closingLoading}
                selectedDate={selectedDate}
                today={today}
                year={year}
                month={month}
                day={day}
                weekday={weekday}
                confirmed={confirmed}
                completed={completed}
                unchecked={unchecked}
                closingMemo={closingMemo}
                setClosingMemo={setClosingMemo}
                showClosingModal={showClosingModal}
                setShowClosingModal={setShowClosingModal}
                closing={closing}
                handleClosing={handleClosing}
                setSelectedDate={setSelectedDate}
            />

            {errorMessage && (
                <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}

            {/* 予約一覧 */}
            <div className="bg-white rounded-xl shadow">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800">
                        {selectedDate === today ? '本日の予約' : `${year}年${month}月${day}日の予約`}
                    </h2>
                    <Link href={`/staff/reservations?date=${selectedDate}`} className="text-blue-600 text-sm hover:underline">
                        タイムテーブルで見る →
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">読み込み中...</div>
                ) : (
                    <div className="divide-y divide-slate-100">

                        {/* 未会計（過去日） */}
                        {unpaidReservations.filter(r => toJstDateStr(r.start_at) !== selectedDate).length > 0 && (
                            <>
                                <div className="px-6 py-2 bg-orange-50 border-b">
                                    <p className="text-sm font-semibold text-orange-600">未会計（過去日）</p>
                                </div>
                                {unpaidReservations
                                    .filter(r => toJstDateStr(r.start_at) !== selectedDate)
                                    .map(r => (
                                        <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                                            <div className="text-center w-16 shrink-0">
                                                <p className="font-bold text-slate-800 text-sm">{formatTime(r.start_at)}</p>
                                                <p className="text-slate-400 text-xs">{formatTime(r.end_at)}</p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-800 truncate">{r.user.name}</p>
                                                <p className="text-slate-500 text-xs truncate">{r.menus.map(m => m.name).join('・')}</p>
                                                <p className="text-orange-500 text-sm font-medium mt-0.5">{dateLabel(r.start_at)}分（未会計）</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-slate-800 text-sm">
                                                    ¥{r.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0).toLocaleString()}
                                                </p>
                                                <Link href={`/staff/payments/${r.id}?from=${selectedDate}`} className="text-blue-600 text-sm hover:underline">
                                                    会計する
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        )}

                        {/* 繰り越し会計（前回レジ締め後〜当日レジ締めの過去日予約） */}
                        {carryOverReservations.length > 0 && (
                            <>
                                <div className="px-6 py-2 bg-purple-50 border-b">
                                    <p className="text-sm font-semibold text-purple-600">繰り越し会計（本日売上へ計上）</p>
                                </div>
                                {carryOverReservations.map(r => (
                                    <div key={r.id} className="px-6 py-4 flex items-center gap-4 bg-purple-50/30">
                                        <div className="text-center w-16 shrink-0">
                                            <p className="font-bold text-slate-500 text-sm">{formatTime(r.start_at)}</p>
                                            <p className="text-slate-400 text-xs">{formatTime(r.end_at)}</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-600 truncate">{r.user.name}</p>
                                            <p className="text-slate-400 text-xs truncate">{r.menus.map(m => m.name).join('・')}</p>
                                            <p className="text-purple-500 text-sm font-medium mt-0.5">
                                                {dateLabel(r.start_at)}分（本日売上へ計上）
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-slate-500 text-sm">
                                                ¥{(r.payment ? r.payment.amount - r.payment.discount : r.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0)).toLocaleString()}
                                            </p>
                                            <div className="flex items-center gap-1 justify-end">
                                                <span className="text-sm text-slate-400">{methodLabel(r.payment?.method ?? null)}</span>
                                                <span className="text-sm text-slate-400">会計済み</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="px-6 py-2 bg-blue-50 border-b">
                                    <p className="text-sm font-semibold text-blue-600">本日の予約</p>
                                </div>
                            </>
                        )}

                        {/* 本日の予約（当日start_at） */}
                        {todayReservations.length === 0 && carryOverReservations.length === 0 && unpaidReservations.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">予約はありません</div>
                        ) : (
                            todayReservations
                            .filter(r => !afterClosingReservations.some(a => a.id === r.id))
                            .map(r => {
                                const total = r.payment && !r.payment.is_draft
                                    ? r.payment.amount - r.payment.discount
                                    : r.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0);
                                const hasPayment = r.payment && !r.payment.is_draft;
                                const paidDateStr = r.payment?.paid_at ? toJstDateStr(r.payment.paid_at) : null;
                                const startDateStr = toJstDateStr(r.start_at);

                                // レジ締め後会計の判定
                                const isAfterClosing = hasPayment && r.payment!.daily_closing_id === null;

                                return (
                                    <div key={r.id} className={`px-6 py-4 flex items-center gap-4 ${r.status === 'completed' ? 'opacity-60' : ''}`}>
                                        <div className="text-center w-16 shrink-0">
                                            <p className="font-bold text-slate-800 text-sm">{formatTime(r.start_at)}</p>
                                            <p className="text-slate-400 text-xs">{formatTime(r.end_at)}</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{r.user.name}</p>
                                            <p className="text-slate-500 text-xs truncate">{r.menus.map(m => m.name).join('・')}</p>

                                            {hasPayment && (() => {
                                                // 当日レジ締め後に会計（まだ次のレジ締め未確定）
                                                if (isAfterClosing) {
                                                    // 翌日以降のレジ締め完了後は paid_at の日時を表示
                                                    if (data?.closing && r.payment?.paid_at) {
                                                        const paidAt = new Date(r.payment.paid_at);
                                                        const closedAt = new Date(data.closing.closed_at);
                                                        if (paidAt > closedAt) {
                                                            return (
                                                                <p className="text-orange-500 text-sm mt-1">
                                                                    レジ締め後に会計・翌営業日の売上へ計上
                                                                </p>
                                                            );
                                                        }
                                                    }
                                                    return (
                                                        <p className="text-orange-500 text-sm mt-1">
                                                            レジ締め後会計（翌営業日の売上）
                                                        </p>
                                                    );
                                                }

                                                // 過去日の予約でレジ締め後に会計（日付が違う）
                                                if (paidDateStr && paidDateStr !== startDateStr) {
                                                    return (
                                                        <p className="text-purple-600 text-sm font-medium mt-0.5">
                                                            ※レジ締め後に会計（{new Date(r.payment!.paid_at!).toLocaleString('ja-JP', {
                                                                timeZone: 'Asia/Tokyo',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}）
                                                        </p>
                                                    );
                                                }

                                                return null;
                                            })()}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-slate-800 text-sm">¥{total.toLocaleString()}</p>
                                            {hasPayment ? (
                                                <div className="flex items-center gap-1 justify-end">
                                                    <span className="text-sm text-slate-400">{methodLabel(r.payment?.method ?? null)}</span>
                                                    <span className="text-sm text-slate-400">会計済み</span>
                                                </div>
                                            ) : r.status === 'confirmed' ? (
                                                <Link href={`/staff/payments/${r.id}`} className="text-blue-600 text-sm hover:underline">
                                                    会計する
                                                </Link>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* レジ締め後会計（当日レジ締め後に会計した予約） */}
                        {afterClosingReservations.length > 0 && (
    <>
        <div className="px-6 py-2 bg-orange-50 border-b">
            <p className="text-sm font-semibold text-orange-600">レジ締め後に会計（翌営業日の売上）</p>
        </div>
        {afterClosingReservations.map(r => (
            <div key={r.id} className="px-6 py-4 flex items-center gap-4 opacity-70">
                <div className="text-center w-16 shrink-0">
                    <p className="font-bold text-slate-500 text-sm">{formatTime(r.start_at)}</p>
                    <p className="text-slate-400 text-xs">{formatTime(r.end_at)}</p>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-500 truncate">{r.user.name}</p>
                    <p className="text-slate-400 text-xs truncate">{r.menus.map(m => m.name).join('・')}</p>
                    {r.payment?.daily_closing_id ? (
                        <p className="text-orange-400 text-sm font-medium mt-0.5">
                            ※{new Date(r.payment.sales_date!).toLocaleDateString('ja-JP', {
                                timeZone: 'Asia/Tokyo',
                                month: 'long',
                                day: 'numeric',
                            })}分としてレジ締め済み
                        </p>
                    ) : (
                        <p className="text-orange-400 text-sm font-medium mt-0.5">
                            レジ締め後に会計（{r.payment?.paid_at
                                ? new Date(r.payment.paid_at).toLocaleString('ja-JP', {
                                    timeZone: 'Asia/Tokyo',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })
                                : ''}）
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-bold text-slate-500 text-sm">
                        ¥{(r.payment ? r.payment.amount - r.payment.discount : r.menus.reduce((s, m) => s + m.pivot.price_at_booking, 0)).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                        <span className="text-sm text-slate-400">{methodLabel(r.payment?.method ?? null)}</span>
                        <span className="text-sm text-slate-400">会計済み</span>
                    </div>
                </div>
            </div>
        ))}
    </>
)}

                    </div>
                )}
            </div>
        </StaffGuard>
    );
}
