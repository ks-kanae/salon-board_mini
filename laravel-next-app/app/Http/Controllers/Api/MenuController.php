<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMenuRequest;
use App\Http\Requests\Api\UpdateMenuRequest;
use App\Models\Menu;
use App\Models\Salon;
use Illuminate\Support\Facades\Auth;

class MenuController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    // お客様用：指定サロンの有効なメニュー一覧
    public function index(int $salonId)
    {
        $salon = Salon::findOrFail($salonId);
        return response()->json(
            $salon->menus()
                ->where('is_active', true)
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
        );
    }

    // スタッフ用：自分のサロンの全メニュー
    public function indexAll()
    {
        $salonId = Auth::user()->salon_id;
        return response()->json(
            Menu::where('salon_id', $salonId)
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    // スタッフ用：メニュー作成
    public function store(StoreMenuRequest $request)
    {
        $menu = Menu::create(array_merge(
            $request->validated(),
            ['salon_id' => Auth::user()->salon_id]
        ));
        return response()->json($menu, 201);
    }

    /**
     * Update the specified resource in storage.
     */
    // スタッフ用：メニュー更新
    public function update(UpdateMenuRequest $request, Menu $menu)
    {
        $menu->update($request->validated());
        return response()->json($menu);
    }

    /**
     * Remove the specified resource from storage.
     */
    // スタッフ用：メニュー削除
    public function destroy(Menu $menu)
    {
        $menu->delete();
        return response()->noContent();
    }
}
