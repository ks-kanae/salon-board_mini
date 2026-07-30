"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

type Salon = {
    id: number;
    name: string;
    category: 'eyelash' | 'nail' | 'hair';
    address: string;
    phone: string;
    open_hour: number;
    close_hour: number;
};

const categoryLabel: Record<Salon['category'], string> = {
    eyelash: 'まつげエクステ',
    nail: 'ネイル',
    hair: '美容院',
};

const categoryColor: Record<Salon['category'], string> = {
    eyelash: 'bg-pink-100 text-pink-700',
    nail: 'bg-purple-100 text-purple-700',
    hair: 'bg-blue-100 text-blue-700',
};

const categoryEmoji: Record<Salon['category'], string> = {
    eyelash: '👁',
    nail: '💅',
    hair: '✂️',
};

export default function HomePage() {
    const [salons, setSalons] = useState<Salon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/api/salons")
            .then(res => setSalons(res.data))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Beauty Salon</h1>
                <p className="text-gray-500">ご来店をお待ちしております</p>
            </div>

            <h2 className="text-xl font-bold text-gray-700 mb-4">店舗一覧</h2>

            {loading ? (
                <p className="text-gray-500 text-center py-8">読み込み中...</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {salons.map(salon => (
                        <Link
                            key={salon.id}
                            href={`/salons/${salon.id}`}
                            className="bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6 block"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-3xl">{categoryEmoji[salon.category]}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColor[salon.category]}`}>
                                    {categoryLabel[salon.category]}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg mb-2">{salon.name}</h3>
                            <p className="text-gray-500 text-sm mb-1">{salon.address}</p>
                            <p className="text-gray-500 text-sm">
                                営業時間：{salon.open_hour}:00 〜 {salon.close_hour}:00
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
