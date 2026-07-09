"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/");
        router.refresh();
    };

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-gray-800">
                ECサイト
                </Link>
                <nav className="flex items-center gap-4">
                    {!isLoading && (
                        user ? (
                            <div className="flex items-center gap-3">
                                <span className="text-gray-700 text-sm">{user.name}さん</span>
                                <button
                                    onClick={handleLogout}
                                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                                >
                                    ログアウト
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
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
