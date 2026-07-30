"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/login");
        router.refresh();
    };

    return (
        <header className="bg-red-200 shadow">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                <Link href={user?.role === 'staff' ? '/staff' : '/'} className="text-2xl font-bold text-gray-800">
                {user?.role === 'staff' ? 'SALON BOARD mini' : 'HP Beauty'}
                </Link>

                <nav className="flex items-center gap-4">
                    {!isLoading && (
                        user ? (
                            <>
                                {user.role === 'customer' && (
                                    <>
                                        <Link href="/reservations" className="text-gray-600 hover:text-gray-800 text-sm">
                                            予約一覧
                                        </Link>
                                        <Link href="/" className="text-gray-600 hover:text-gray-800 text-sm">
                                            店舗を探す
                                        </Link>
                                    </>
                                )}
                                {user.role === 'staff' && (
                                    <>
                                        <Link href="/staff" className="text-gray-600 hover:text-gray-800 text-sm">
                                            予約管理
                                        </Link>
                                        <Link href="/staff/menus" className="text-gray-600 hover:text-gray-800 text-sm">
                                            メニュー管理
                                        </Link>
                                    </>
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-700 text-sm">{user.name}さん</span>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-rose-400 text-white px-4 py-2 rounded text-sm hover:bg-rose-500 transition-colors"
                                    >
                                        ログアウト
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-rose-400 text-white px-4 py-2 rounded hover:bg-rose-500 transition-colors text-sm"
                            >
                                ログイン
                            </Link>
                        )
                    )}
                </nav>
            </div>
        </header>
    );
}
