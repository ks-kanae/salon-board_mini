"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/lib/auth-context";

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
    description: string | null;
    price: number;
    duration_minutes: number;
};

const categoryLabel: Record<Salon['category'], string> = {
    eyelash: 'まつげエクステ',
    nail: 'ネイル',
    hair: 'ヘアサロン',
};

export default function SalonPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const salonId = params.id as string;

    const [salon, setSalon] = useState<Salon | null>(null);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get(`/api/salons/${salonId}/menus`),
        ]).then(([menusRes]) => {
            setMenus(menusRes.data);
        }).catch(() => {
            router.push('/');
        }).finally(() => setLoading(false));

        // salonsの一覧から該当店舗を取得
        api.get('/api/salons').then(res => {
            const found = res.data.find((s: Salon) => s.id === Number(salonId));
            if (found) setSalon(found);
        });
    }, [salonId]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">読み込み中...</div>;
    }

    if (!salon) {
        return <div className="flex justify-center items-center min-h-screen">店舗が見つかりません</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* 店舗情報 */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 店舗一覧</Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">{salon.name}</h1>
                <p className="text-sm text-gray-500 mb-4">{categoryLabel[salon.category]}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                        <span className="text-gray-400">📍</span>
                        <span className="text-gray-600">{salon.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">📞</span>
                        <span className="text-gray-600">{salon.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400">🕐</span>
                        <span className="text-gray-600">{salon.open_hour}:00 〜 {salon.close_hour}:00</span>
                    </div>
                </div>
            </div>

            {/* メニュー一覧 */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-700">メニュー</h2>
                {!isLoading && user?.role === 'customer' && (
                    <Link
                        href={`/salons/${salonId}/reserve`}
                        className="bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors text-sm"
                    >
                        予約する
                    </Link>
                )}
                {!isLoading && !user && (
                    <Link
                        href="/login"
                        className="bg-rose-400 text-white px-4 py-2 rounded-lg hover:bg-rose-500 transition-colors text-sm"
                    >
                        ログインして予約
                    </Link>
                )}
            </div>

            <div className="grid gap-3">
                {menus.map(menu => (
                    <div key={menu.id} className="bg-white rounded-lg shadow p-5 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-800">{menu.name}</h3>
                            {menu.description && (
                                <p className="text-gray-500 text-sm mt-1">{menu.description}</p>
                            )}
                            {menu.duration_minutes > 0 && (
                                <p className="text-gray-400 text-sm mt-1">所要時間：{menu.duration_minutes}分</p>
                            )}
                        </div>
                        <div className="text-right ml-4">
                            <p className="text-lg font-bold text-gray-800">¥{menu.price.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
