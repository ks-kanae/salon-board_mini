"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import StaffGuard from "@/components/StaffGuard";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Toast from "@/components/Toast";

type Menu = {
    id: number;
    name: string;
    category: string | null;
    sort_order: number;
    description: string | null;
    price: number;
    duration_minutes: number;
    is_active: boolean;
};

type Staff = {
    id: number;
    name: string;
    skills: number[] | null;
};

type EditingMenu = {
    name: string;
    category: string;
    sort_order: number;
    description: string;
    price: number;
    duration_minutes: number;
    is_active: boolean;
};

type Tab = 'menus' | 'skills';

function SortableCategoryHeader({ category, count }: { category: string; count: number }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `category-${category}` });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div
                {...attributes}
                {...listeners}
                className="text-slate-300 cursor-grab active:cursor-grabbing text-lg select-none"
                title="ドラッグしてカテゴリーを並び替え"
            >
                ⠿
            </div>
            <h3 className="text-sm font-bold text-slate-600">
                {category === '未分類' ? '📋 未分類' : `📁 ${category}`}
                <span className="ml-2 text-xs font-normal text-slate-400">{count}件</span>
            </h3>
        </div>
    );
}

function SortableMenuItem({
    menu,
    onEdit,
    onDelete,
}: {
    menu: Menu;
    onEdit: (menu: Menu) => void;
    onDelete: (menu: Menu) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: menu.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`px-5 py-4 flex items-center gap-4 ${!menu.is_active ? 'opacity-50' : ''}`}>
            <div
                {...attributes}
                {...listeners}
                className="text-slate-300 cursor-grab active:cursor-grabbing text-lg select-none"
                title="ドラッグして並び替え"
            >
                ⠿
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 truncate">{menu.name}</p>
                    {!menu.is_active && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">非表示</span>
                    )}
                </div>
                {menu.description && <p className="text-slate-500 text-sm truncate">{menu.description}</p>}
                <p className="text-slate-400 text-xs mt-0.5">
                    {menu.duration_minutes > 0 ? `${menu.duration_minutes}分` : '時間指定なし'}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className="font-bold text-slate-800">¥{menu.price.toLocaleString()}</p>
            </div>
            <div className="flex gap-2 shrink-0">
                <button onClick={() => onEdit(menu)} className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50">編集</button>
                <button onClick={() => onDelete(menu)} className="px-3 py-1.5 border border-red-200 rounded text-xs text-red-500 hover:bg-red-50">削除</button>
            </div>
        </div>
    );
}

export default function StaffMenusPage() {
    const [tab, setTab] = useState<Tab>('menus');

    // メニュー管理
    const [menus, setMenus] = useState<Menu[]>([]);
    const [menusLoading, setMenusLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [editValues, setEditValues] = useState<EditingMenu>({
        name: '', category: '', sort_order: 0, description: '', price: 0, duration_minutes: 0, is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

    // カテゴリー入力（既存カテゴリーのサジェスト用）
    const existingCategories = [...new Set(menus.map(m => m.category).filter(Boolean))] as string[];

    // スキル設定
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [savingSkills, setSavingSkills] = useState<number | null>(null);
    const [staffSkills, setStaffSkills] = useState<Record<number, number[]>>({});

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => { fetchMenus(); }, []);

    useEffect(() => {
        if (tab === 'skills' && staffList.length === 0) fetchSkills();
    }, [tab]);

    const fetchMenus = async () => {
        setMenusLoading(true);
        const res = await api.get('/api/staff/menus');
        setMenus(res.data);
        const cats = [...new Set(res.data.map((m: Menu) => m.category ?? '未分類'))] as string[];
        setCategoryOrder(cats);
        setMenusLoading(false);
    };

    const fetchSkills = async () => {
        setSkillsLoading(true);
        const res = await api.get('/api/staff/members');
        const staff: Staff[] = res.data;
        setStaffList(staff);
        const skillMap: Record<number, number[]> = {};
        staff.forEach(s => { skillMap[s.id] = s.skills ?? []; });
        setStaffSkills(skillMap);
        setSkillsLoading(false);
    };

    // メニュー管理
    const startEdit = (menu: Menu) => {
        setEditingId(menu.id);
        setEditValues({
            name: menu.name,
            category: menu.category ?? '',
            sort_order: menu.sort_order,
            description: menu.description ?? '',
            price: menu.price,
            duration_minutes: menu.duration_minutes,
            is_active: menu.is_active,
        });
    };

    const startNew = () => {
        setEditingId('new');
        setEditValues({ name: '', category: '', sort_order: 0, description: '', price: 0, duration_minutes: 0, is_active: true });
    };

    const cancelEdit = () => setEditingId(null);

    const handleSave = async () => {
        if (!editValues.name) return;
        setSaving(true);
        try {
            const payload = {
                ...editValues,
                category: editValues.category || null,
            };
            if (editingId === 'new') {
                const res = await api.post('/api/staff/menus', payload);
                setMenus(prev => [...prev, res.data]);
                // 新しいカテゴリーが追加された場合はcategoryOrderにも追加
                const newCat = res.data.category ?? '未分類';
                setCategoryOrder(prev =>
                    prev.includes(newCat) ? prev : [...prev, newCat]
                );
            } else {
                const res = await api.put(`/api/staff/menus/${editingId}`, payload);
                setMenus(prev => prev.map(m => m.id === editingId ? res.data : m));
                // カテゴリーが変わった場合も追加
                const newCat = res.data.category ?? '未分類';
                setCategoryOrder(prev =>
                    prev.includes(newCat) ? prev : [...prev, newCat]
                );
            }
            setEditingId(null);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await api.delete(`/api/staff/menus/${deleteTarget.id}`);
        setMenus(prev => prev.filter(m => m.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    // カテゴリーごとにグループ化
    const groupedMenus = menus.reduce<Record<string, Menu[]>>((acc, menu) => {
        const cat = menu.category ?? '未分類';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(menu);
        return acc;
    }, {});

    // スキル設定
    const toggleSkill = (staffId: number, menuId: number) => {
        setStaffSkills(prev => {
            const current = prev[staffId] ?? [];
            const updated = current.includes(menuId)
                ? current.filter(id => id !== menuId)
                : [...current, menuId];
            return { ...prev, [staffId]: updated };
        });
    };

    const saveSkills = async (staffId: number) => {
        setSavingSkills(staffId);
        try {
            await api.patch(`/api/staff/members/${staffId}/skills`, {
                skills: staffSkills[staffId] ?? [],
            });
        } catch {
            setErrorMessage('スキルの保存に失敗しました。');
        } finally {
            setSavingSkills(null);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent, category: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const categoryMenus = groupedMenus[category];
        const oldIndex = categoryMenus.findIndex(m => m.id === active.id);
        const newIndex = categoryMenus.findIndex(m => m.id === over.id);
        const reordered = arrayMove(categoryMenus, oldIndex, newIndex);

        // sort_orderを更新
        const updatedMenus = reordered.map((m, i) => ({ ...m, sort_order: i }));

        // stateを即時更新
        setMenus(prev => {
            const otherMenus = prev.filter(m => (m.category ?? '未分類') !== category);
            return [...otherMenus, ...updatedMenus].sort((a, b) =>
                (a.category ?? '未分類').localeCompare(b.category ?? '未分類') || a.sort_order - b.sort_order
            );
        });

        // APIに保存
        await Promise.all(updatedMenus.map(m =>
            api.put(`/api/staff/menus/${m.id}`, {
                sort_order: m.sort_order,
                name: m.name,
                price: m.price,
                duration_minutes: m.duration_minutes,
                category: m.category,
                is_active: m.is_active,})
        ));
    };

    const handleCategoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categoryOrder.indexOf(String(active.id).replace('category-', ''));
        const newIndex = categoryOrder.indexOf(String(over.id).replace('category-', ''));
        setCategoryOrder(prev => arrayMove(prev, oldIndex, newIndex));
    };

    // 編集フォームのJSX（インライン）
    const editForm = (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">メニュー名 *</label>
                    <input
                        type="text"
                        value={editValues.name}
                        onChange={e => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="カット・マツエク 120本・ネイル フレンチ"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">カテゴリー</label>
                    <input
                        type="text"
                        value={editValues.category}
                        onChange={e => setEditValues(prev => ({ ...prev, category: e.target.value }))}
                        list="category-list"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="例：トリートメント・マツエク・オフ"
                    />
                    <datalist id="category-list">
                        {existingCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">料金（円）</label>
                    <input
                        type="number"
                        value={editValues.price}
                        onChange={e => setEditValues(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        min={0}
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">所要時間（分）</label>
                    <input
                        type="number"
                        value={editValues.duration_minutes}
                        onChange={e => setEditValues(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        min={0}
                        step={5}
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">並び順</label>
                    <input
                        type="number"
                        value={editValues.sort_order}
                        onChange={e => setEditValues(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        min={0}
                    />
                    <p className="text-xs text-slate-400 mt-0.5">数字が小さいほど上に表示</p>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">説明</label>
                    <input
                        type="text"
                        value={editValues.description}
                        onChange={e => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="メニューの説明"
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={editValues.is_active}
                        onChange={e => setEditValues(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-600">表示する（お客様に見せる）</span>
                </label>
                <div className="flex gap-2">
                    <button onClick={cancelEdit} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-sm hover:bg-slate-50">
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!editValues.name || saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <StaffGuard>
            {/* 削除確認モーダル */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">メニューを削除しますか？</h2>
                        <p className="text-slate-600 text-sm mb-6">「{deleteTarget.name}」を削除します。この操作は取り消せません。</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">キャンセル</button>
                            <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">削除する</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-800">メニュー管理</h1>

                {errorMessage && (
                    <Toast message={errorMessage} onClose={() => setErrorMessage(null)} />
                )}

                {/* タブ */}
                <div className="flex border-b border-slate-200">
                    {(['menus', 'skills'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {t === 'menus' ? 'メニュー設定' : 'スタッフスキル設定'}
                        </button>
                    ))}
                </div>

                {/* メニュー一覧タブ */}
                {tab === 'menus' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-slate-500 text-sm">{menus.length}件のメニュー</p>
                            {editingId !== 'new' && (
                                <button onClick={startNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                    ＋ メニューを追加
                                </button>
                            )}
                        </div>

                        {editingId === 'new' && editForm}

                        {menusLoading ? (
                            <div className="text-center py-12 text-slate-500">読み込み中...</div>
                        ) : menus.length === 0 ? (
                            <div className="bg-white rounded-xl shadow p-12 text-center text-slate-500">メニューがまだありません</div>
                        ) : (
                            <div className="space-y-4">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleCategoryDragEnd}
                                >
                                    <SortableContext
                                        items={categoryOrder.map(c => `category-${c}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {categoryOrder.map(category => {
                                            const categoryMenus = groupedMenus[category] ?? [];
                                            if (categoryMenus.length === 0) return null;
                                            return (
                                                <div key={category} className="bg-white rounded-xl shadow overflow-hidden">
                                                    <SortableCategoryHeader category={category} count={categoryMenus.length} />
                                                    <div className="divide-y divide-slate-100">
                                                        <DndContext
                                                            sensors={sensors}
                                                            collisionDetection={closestCenter}
                                                            onDragEnd={(event) => handleDragEnd(event, category)}
                                                        >
                                                            <SortableContext
                                                                items={categoryMenus.map(m => m.id)}
                                                                strategy={verticalListSortingStrategy}
                                                            >
                                                                {categoryMenus.map(menu => (
                                                                    <div key={menu.id}>
                                                                        {editingId === menu.id ? (
                                                                            <div className="p-4">{editForm}</div>
                                                                        ) : (
                                                                            <SortableMenuItem
                                                                                menu={menu}
                                                                                onEdit={startEdit}
                                                                                onDelete={setDeleteTarget}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </SortableContext>
                                                        </DndContext>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}
                    </div>
                )}

                {/* スキル設定タブ */}
                {tab === 'skills' && (
                    <div className="space-y-4">
                        <p className="text-slate-500 text-sm">スタッフごとに対応できるメニューを設定します。チェックなし＝全メニュー対応可能です。</p>
                        {skillsLoading ? (
                            <div className="text-center py-12 text-slate-500">読み込み中...</div>
                        ) : (
                            <div className="space-y-4">
                                {staffList.map(staff => {
                                    const skills = staffSkills[staff.id] ?? [];
                                    const isAllMenu = skills.length === 0;
                                    return (
                                        <div key={staff.id} className="bg-white rounded-xl shadow p-5">
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{staff.name}</h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {isAllMenu ? '全メニュー対応可能' : `${skills.length}件のメニューに対応`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {!isAllMenu && (
                                                        <button onClick={() => setStaffSkills(prev => ({ ...prev, [staff.id]: [] }))} className="text-xs text-slate-400 hover:text-slate-600">
                                                            全解除
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => saveSkills(staff.id)}
                                                        disabled={savingSkills === staff.id}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {savingSkills === staff.id ? '保存中...' : '保存'}
                                                    </button>
                                                </div>
                                            </div>
                                            {Object.entries(groupedMenus).map(([category, categoryMenus]) => (
                                                <div key={category} className="mb-4">
                                                    <p className="text-xs font-medium text-slate-500 mb-2">
                                                        {category === '未分類' ? '未分類' : category}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                        {categoryMenus.map(menu => {
                                                            const checked = skills.includes(menu.id);
                                                            return (
                                                                <label
                                                                    key={menu.id}
                                                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                                                        checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() => toggleSkill(staff.id, menu.id)}
                                                                        className="w-4 h-4 rounded accent-blue-600"
                                                                    />
                                                                    <span className="text-sm text-slate-700 truncate">{menu.name}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                            {isAllMenu && (
                                                <p className="text-xs text-slate-400 mt-3">※ チェックなしの場合、全メニューに対応可能として扱われます</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </StaffGuard>
    );
}
