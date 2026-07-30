"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";

type Notification = {
    id: number;
    type: 'new_reservation' | 'cancelled';
    reservation: {
        id: number;
        start_at: string;
        user: { name: string };
        menus: { name: string }[];
    };
    created_at: string;
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/api/staff/notifications');
            setNotifications(res.data);
        } catch {}
    }, []);

    // 60秒ごとに自動更新
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const markAsRead = async (id: number) => {
        await api.patch(`/api/staff/notifications/${id}/read`);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const markAllAsRead = async () => {
        await api.patch('/api/staff/notifications/read-all');
        setNotifications([]);
        setShowNotifications(false);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',hour12: false,timeZone:'Asia/Tokyo'
        });
    };

    const navItems = [
        { href: "/staff", label: "ダッシュボード" },
        { href: "/staff/reservations", label: "予約管理" },
        { href: "/staff/reservations/list", label: "予約一覧" },
        { href: "/staff/customers", label: "顧客管理" },
        { href: "/staff/menus", label: "メニュー管理" },
        { href: "/staff/shifts", label: "シフト管理" },
    ];

    const isActive = (href: string) => {
    if (href === "/staff") {
        return pathname === "/staff";
    }

    if (href === "/staff/reservations") {
        return (
        pathname === "/staff/reservations" ||
        pathname.startsWith("/staff/reservations/")
        && !pathname.startsWith("/staff/reservations/list")
        );
    }

    return pathname === href;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* スタッフ用ヘッダー */}
            <header className="bg-blue-600 text-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <Link href="/staff" className="text-2xl font-bold">
                            SALON BOARD mini
                        </Link>
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                                        isActive(item.href)
                                            ? 'bg-blue-500 text-white'
                                            : 'text-blue-100 hover:bg-blue-600'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">

                        {/* 通知ベル */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(prev => !prev)}
                                className="relative p-2 text-blue-100 hover:text-white hover:bg-blue-600 rounded-lg transition-colors"
                            >
                                <span className="text-md">🔔新着</span>
                                {notifications.length > 0 && (
                                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                        {notifications.length > 9 ? '9+' : notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* 通知ドロップダウン */}
                            {showNotifications && (
                                <>
                                    {/* 背景クリックで閉じる */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden">
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                                            <h3 className="font-bold text-slate-800 text-sm">
                                                通知
                                                {notifications.length > 0 && (
                                                    <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                                                        {notifications.length}件
                                                    </span>
                                                )}
                                            </h3>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={markAllAsRead}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    全て既読にする
                                                </button>
                                            )}
                                        </div>

                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                                新しい通知はありません
                                            </div>
                                        ) : (
                                            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                                                {notifications.map(n => (
                                                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    {n.type === 'new_reservation' ? (
                                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                            新規予約
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                            キャンセル
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-slate-400">
                                                                        {formatTime(n.created_at)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                                    {n.reservation.user.name}さん
                                                                </p>
                                                                <p className="text-xs text-slate-500 truncate">
                                                                    {formatTime(n.reservation.start_at)}
                                                                </p>
                                                                <p className="text-xs text-slate-400 truncate">
                                                                    {n.reservation.menus.map(m => m.name).join('・')}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => markAsRead(n.id)}
                                                                className="shrink-0 text-slate-300 hover:text-slate-500 text-lg leading-none mt-0.5"
                                                                title="既読にする"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                // 予約の詳細を表示
                                                                markAsRead(n.id);
                                                                const reservationDate = n.reservation.start_at.split('T')[0];
                                                                router.push(`/staff/reservations?date=${reservationDate}&highlight=${n.reservation.id}`);
                                                                setShowNotifications(false);
                                                            }}
                                                            className="mt-2 text-xs text-blue-600 hover:underline"
                                                        >
                                                            予約管理で確認する →
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="bg-blue-900 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-800 transition-colors"
                        >
                            ログアウト
                        </button>
                    </div>
                </div>

                {/* モバイル用ナビ */}
                <div className="md:hidden border-t border-blue-600 px-4 py-2 flex gap-2 overflow-x-auto">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
                                isActive(item.href)
                                    ? 'bg-blue-900 text-white'
                                    : 'text-blue-100 hover:bg-blue-600'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    );
}
