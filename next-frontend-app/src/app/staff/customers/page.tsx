"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";

type Customer = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    visit_count: number;
    last_visited_at: string | null;
    total_visits: number;
    reservations: {
        id: number;
        start_at: string;
    }[];
};

type Pagination = {
    data: Customer[];
    current_page: number;
    last_page: number;
    total: number;
};

export default function CustomersPage() {
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (search === null && !showAll) return;
        fetchCustomers();
    }, [search, page, showAll]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/staff/customers', {
                params: { search: search || undefined, page },
            });
            setPagination(res.data);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '-';
        return iso.slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) =>
            `${y}年${parseInt(m)}月${parseInt(d)}日`
        );
    };

    return (
        <StaffGuard>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">顧客管理</h1>
                        {pagination && (
                            <p className="text-slate-500 text-sm mt-1">{pagination.total}件の顧客</p>
                        )}
                    </div>
                </div>

                {/* 検索 */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="名前・電話番号で検索"
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                        検索
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSearch(null); setSearchInput(''); setShowAll(true); setPage(1); }}
                        className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
                    >
                        全件表示
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                            className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
                        >
                            クリア
                        </button>
                    )}
                </form>

                {/* 未検索状態の表示 */}
                {search === null && !showAll && (
                    <div className="bg-white rounded-xl shadow p-12 text-center text-slate-400">
                        <p className="text-sm">名前・電話番号で検索<br/>または<br/>「全件表示」を押してください</p>
                    </div>
                )}

                {/* 顧客一覧 */}
                {(search !== null || showAll) && (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">読み込み中...</div>
                        ) : !pagination || pagination.data.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                {search ? `「${search}」の検索結果はありません` : '顧客がいません'}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pagination.data.map(customer => (
                                    <Link
                                        key={customer.id}
                                        href={`/staff/customers/${customer.id}`}
                                        className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors block"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <span className="text-blue-600 font-bold text-sm">
                                                {customer.name.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800">{customer.name}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">
                                                {customer.phone ?? 'Phone未登録'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-medium text-slate-800">
                                                {customer.total_visits}回来店
                                            </p>
                                            <p className="text-slate-400 text-xs mt-0.5">
                                                最終: {formatDate(customer.last_visited_at)}
                                            </p>
                                        </div>
                                        <span className="text-slate-300 text-lg">›</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ページネーション */}
                {pagination && pagination.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50"
                        >
                            ← 前へ
                        </button>
                        <span className="px-4 py-2 text-sm text-slate-600">
                            {page} / {pagination.last_page}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                            disabled={page === pagination.last_page}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-50"
                        >
                            次へ →
                        </button>
                    </div>
                )}
            </div>
        </StaffGuard>
    );
}
