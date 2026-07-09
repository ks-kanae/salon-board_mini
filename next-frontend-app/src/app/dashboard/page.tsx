"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <p className="text-gray-600">読み込み中...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">
                ようこそ、{user.name}さん！
                </p>
                <p className="text-gray-600 mt-2">
                このページは認証されたユーザーのみアクセスできます。
                </p>
            </div>
        </div>
    );
}
