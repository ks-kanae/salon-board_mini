<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\DailyClosing;
use App\Models\Menu;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Salon;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ========== 店舗作成 ==========
        $eyelash = Salon::create([
            'name' => 'Eyelash Salon',
            'category' => 'eyelash',
            'address' => '東京都渋谷区〇〇1-2-3',
            'phone' => '03-0000-0001',
            'open_hour' => 10,
            'close_hour' => 19,
            'interval_minutes' => 30,
            'is_active' => true,
        ]);

        $nail = Salon::create([
            'name' => 'Nail Salon',
            'category' => 'nail',
            'address' => '東京都渋谷区〇〇1-2-4',
            'phone' => '03-0000-0002',
            'open_hour' => 10,
            'close_hour' => 19,
            'interval_minutes' => 30,
            'is_active' => true,
        ]);

        $hair = Salon::create([
            'name' => 'Hair Salon',
            'category' => 'hair',
            'address' => '東京都渋谷区〇〇1-2-5',
            'phone' => '03-0000-0003',
            'open_hour' => 9,
            'close_hour' => 20,
            'interval_minutes' => 30,
            'is_active' => true,
        ]);

        // ========== スタッフ作成（各店舗3人） ==========
        $eyelashStaff = [];
        foreach ([
            ['name' => 'スタッフ マツエク A', 'email' => 'staff.eyelash.a@example.com', 'phone' => '090-1000-0001'],
            ['name' => 'スタッフ マツエク B', 'email' => 'staff.eyelash.b@example.com', 'phone' => '090-1000-0002'],
            ['name' => 'スタッフ マツエク C', 'email' => 'staff.eyelash.c@example.com', 'phone' => '090-1000-0003'],
        ] as $s) {
            $eyelashStaff[] = User::create(array_merge($s, [
                'password' => Hash::make('password'),
                'role' => 'staff',
                'salon_id' => $eyelash->id,
            ]));
        }

        $nailStaff = [];
        foreach ([
            ['name' => 'スタッフ ネイル A', 'email' => 'staff.nail.a@example.com', 'phone' => '090-2000-0001'],
            ['name' => 'スタッフ ネイル B', 'email' => 'staff.nail.b@example.com', 'phone' => '090-2000-0002'],
            ['name' => 'スタッフ ネイル C', 'email' => 'staff.nail.c@example.com', 'phone' => '090-2000-0003'],
        ] as $s) {
            $nailStaff[] = User::create(array_merge($s, [
                'password' => Hash::make('password'),
                'role' => 'staff',
                'salon_id' => $nail->id,
            ]));
        }

        $hairStaff = [];
        foreach ([
            ['name' => 'スタッフ ヘア A', 'email' => 'staff.hair.a@example.com', 'phone' => '090-3000-0001'],
            ['name' => 'スタッフ ヘア B', 'email' => 'staff.hair.b@example.com', 'phone' => '090-3000-0002'],
            ['name' => 'スタッフ ヘア C', 'email' => 'staff.hair.c@example.com', 'phone' => '090-3000-0003'],
        ] as $s) {
            $hairStaff[] = User::create(array_merge($s, [
                'password' => Hash::make('password'),
                'role' => 'staff',
                'salon_id' => $hair->id,
            ]));
        }

        // ========== テストお客様（10人） ==========
        $customers = [];
        $customerData = [
            ['name' => '山田 花子', 'email' => 'test1@example.com', 'phone' => '090-0000-0001'],
            ['name' => '佐藤 美咲', 'email' => 'test2@example.com', 'phone' => '090-0000-0002'],
            ['name' => '鈴木 さくら', 'email' => 'test3@example.com', 'phone' => '090-0000-0003'],
            ['name' => '田中 優子', 'email' => 'test4@example.com', 'phone' => '090-0000-0004'],
            ['name' => '伊藤 真由', 'email' => 'test5@example.com', 'phone' => '090-0000-0005'],
            ['name' => '渡辺 あおい', 'email' => 'test6@example.com', 'phone' => '090-0000-0006'],
            ['name' => '中村 りな', 'email' => 'test7@example.com', 'phone' => '090-0000-0007'],
            ['name' => '小林 ゆか', 'email' => 'test8@example.com', 'phone' => '090-0000-0008'],
            ['name' => '加藤 なな', 'email' => 'test9@example.com', 'phone' => '090-0000-0009'],
            ['name' => 'テストユーザー', 'email' => 'test@example.com', 'phone' => '090-0000-0099'],
        ];
        foreach ($customerData as $c) {
            $customers[] = User::create(array_merge($c, [
                'password' => Hash::make('password'),
                'role' => 'customer',
            ]));
        }

        // ========== マツエクメニュー ==========
        $eyelashMenuItems = [
            ['name' => 'マツエク 80本', 'category' => 'マツエク', 'sort_order' => 1, 'description' => 'ナチュラルな仕上がり', 'price' => 4500, 'duration_minutes' => 40],
            ['name' => 'マツエク 100本', 'category' => 'マツエク', 'sort_order' => 2, 'description' => 'ほどよいボリューム', 'price' => 5000, 'duration_minutes' => 60],
            ['name' => 'マツエク 120本', 'category' => 'マツエク', 'sort_order' => 3, 'description' => 'しっかりボリューム', 'price' => 5500, 'duration_minutes' => 60],
            ['name' => 'マツエク 150本', 'category' => 'マツエク', 'sort_order' => 4, 'description' => 'ゴージャスな仕上がり', 'price' => 6400, 'duration_minutes' => 70],
            ['name' => 'マツエク 180本', 'category' => 'マツエク', 'sort_order' => 5, 'description' => 'フルボリューム', 'price' => 7300, 'duration_minutes' => 90],
            ['name' => 'マツエクオフ（付け替え）', 'category' => 'オフ', 'sort_order' => 1, 'description' => 'エクステのオフ（付け替え）', 'price' => 500, 'duration_minutes' => 20],
            ['name' => 'マツエクオフのみ', 'category' => 'オフ', 'sort_order' => 2, 'description' => 'エクステのオフのみ', 'price' => 1000, 'duration_minutes' => 30],
            ['name' => 'LEDグルーへ変更', 'category' => 'オプション', 'sort_order' => 1, 'description' => '汗・水に強く持続力UP', 'price' => 1500, 'duration_minutes' => 0],
            ['name' => 'フラットラッシュへ変更', 'category' => 'オプション', 'sort_order' => 2, 'description' => '軽くて持ちが良い', 'price' => 1000, 'duration_minutes' => 0],
        ];
        $eyelashMenus = [];
        foreach ($eyelashMenuItems as $menu) {
            $eyelashMenus[] = Menu::create(array_merge($menu, ['salon_id' => $eyelash->id, 'is_active' => true]));
        }

        // ========== ネイルメニュー ==========
        $nailMenuItems = [
            ['name' => 'ワンカラー', 'category' => 'ジェルネイル', 'sort_order' => 1, 'description' => '単色カラー', 'price' => 4000, 'duration_minutes' => 60],
            ['name' => 'フレンチ', 'category' => 'ジェルネイル', 'sort_order' => 2, 'description' => 'フレンチネイル', 'price' => 5000, 'duration_minutes' => 75],
            ['name' => 'グラデーション', 'category' => 'ジェルネイル', 'sort_order' => 3, 'description' => 'グラデーションデザイン', 'price' => 5500, 'duration_minutes' => 90],
            ['name' => 'アート1本', 'category' => 'オプション', 'sort_order' => 1, 'description' => 'ネイルアート1本追加', 'price' => 300, 'duration_minutes' => 10],
            ['name' => 'ジェルオフ', 'category' => 'オフ', 'sort_order' => 1, 'description' => 'ジェルネイルオフ', 'price' => 1500, 'duration_minutes' => 30],
            ['name' => 'ジェルオフ＋付け替え', 'category' => 'オフ', 'sort_order' => 2, 'description' => 'オフして新しいデザインへ', 'price' => 2000, 'duration_minutes' => 30],
            ['name' => 'ハンドケア', 'category' => 'ケア', 'sort_order' => 1, 'description' => 'スクラブ＆保湿ケア', 'price' => 2000, 'duration_minutes' => 30],
            ['name' => 'フットケア', 'category' => 'ケア', 'sort_order' => 2, 'description' => '足のケア＆カラー', 'price' => 4500, 'duration_minutes' => 60],
        ];
        $nailMenus = [];
        foreach ($nailMenuItems as $menu) {
            $nailMenus[] = Menu::create(array_merge($menu, ['salon_id' => $nail->id, 'is_active' => true]));
        }

        // ========== 美容院メニュー ==========
        $hairMenuItems = [
            ['name' => 'カット', 'category' => 'カット', 'sort_order' => 1, 'description' => 'シャンプー・ブロー込み', 'price' => 4500, 'duration_minutes' => 60],
            ['name' => 'カラー', 'category' => 'カラー', 'sort_order' => 1, 'description' => 'フルカラー', 'price' => 8000, 'duration_minutes' => 90],
            ['name' => 'カット＋カラー', 'category' => 'カラー', 'sort_order' => 2, 'description' => 'カット＆フルカラーセット', 'price' => 12000, 'duration_minutes' => 120],
            ['name' => 'パーマ', 'category' => 'パーマ', 'sort_order' => 1, 'description' => 'コールドパーマ', 'price' => 9000, 'duration_minutes' => 120],
            ['name' => 'カット＋パーマ', 'category' => 'パーマ', 'sort_order' => 2, 'description' => 'カット＆パーマセット', 'price' => 13000, 'duration_minutes' => 150],
            ['name' => 'トリートメント（グロス）', 'category' => 'トリートメント', 'sort_order' => 1, 'description' => '艶・補修トリートメント', 'price' => 2000, 'duration_minutes' => 30],
            ['name' => 'トリートメント（リペア）', 'category' => 'トリートメント', 'sort_order' => 2, 'description' => 'ダメージ集中補修', 'price' => 4000, 'duration_minutes' => 60],
            ['name' => 'ヘッドスパ', 'category' => 'スパ', 'sort_order' => 1, 'description' => '頭皮マッサージ・クレンジング', 'price' => 3500, 'duration_minutes' => 45],
            ['name' => 'ストレートパーマ（縮毛）', 'category' => 'パーマ', 'sort_order' => 3, 'description' => 'くせ毛・うねり矯正', 'price' => 15000, 'duration_minutes' => 180],
        ];
        $hairMenus = [];
        foreach ($hairMenuItems as $menu) {
            $hairMenus[] = Menu::create(array_merge($menu, ['salon_id' => $hair->id, 'is_active' => true]));
        }

        // ========== ダミー予約作成 ==========
        $salons = [
            ['salon' => $eyelash, 'staff' => $eyelashStaff, 'menus' => $eyelashMenus],
            ['salon' => $nail, 'staff' => $nailStaff, 'menus' => $nailMenus],
            ['salon' => $hair, 'staff' => $hairStaff, 'menus' => $hairMenus],
        ];

        $methods = ['cash', 'credit', 'cashless'];
        $types = ['online', 'manual', 'next'];
        $now = Carbon::now('Asia/Tokyo');

        $unpaidReservations = [];

        foreach ($salons as $salonData) {
            $salon = $salonData['salon'];
            $staff = $salonData['staff'];
            $menus = array_values(array_filter($salonData['menus'], function ($m) {
                return $m->duration_minutes > 0;
            }));

            $prevDailyClosing = null;

            for ($dayOffset = -14; $dayOffset <= 14; $dayOffset++) {
                $date = $now->copy()->addDays($dayOffset)->startOfDay();

                $createUnpaidToday = (
                    $dayOffset === -1
                );
                $unpaidCount = rand(1, 2);
                $createdUnpaid = 0;

                foreach ($staff as $staffMember) {
                    $reservationCount = rand(3, 5);
                    $currentHour = $salon->open_hour;
                    $currentMin = 0;

                    for ($i = 0; $i < $reservationCount; $i++) {
                        $menuCount = rand(1, 2);
                        $selectedMenus = collect($menus)->random(min($menuCount, count($menus)))->all();
                        $duration = collect($selectedMenus)->sum('duration_minutes');
                        if ($duration === 0)
                            continue;

                        $startMinutes = $currentHour * 60 + $currentMin;
                        $endMinutes = $startMinutes + $duration;
                        if ($endMinutes > $salon->close_hour * 60)
                            break;

                        $startAt = $date->copy()->setHour($currentHour)->setMinute($currentMin)->setSecond(0);
                        $endAt = $startAt->copy()->addMinutes($duration);

                        $isNominated = rand(1, 10) <= 3;
                        $type = $types[array_rand($types)];
                        $isCancelled = rand(1, 10) === 1;

                        $reservation = Reservation::create([
                            'salon_id' => $salon->id,
                            'user_id' => $customers[array_rand($customers)]->id,
                            'staff_id' => $staffMember->id,
                            'is_nominated' => $isNominated,
                            'start_at' => $startAt,
                            'end_at' => $endAt,
                            'status' => $isCancelled ? 'cancelled' : ($dayOffset < 0 ? 'completed' : 'confirmed'),
                            'type' => $type,
                            'notes' => null,
                        ]);

                        foreach ($selectedMenus as $menu) {
                            $reservation->menus()->attach($menu->id, [
                                'price_at_booking' => $menu->price,
                            ]);
                        }

                        // 顧客の来店情報を更新
                        if ($dayOffset < 0 && !$isCancelled) {
                            $user = User::find($reservation->user_id);
                            if ($user) {
                                if (!$user->last_visited_at || $startAt->gt($user->last_visited_at)) {
                                    $user->last_visited_at = $startAt;
                                }
                                $user->visit_count = ($user->visit_count ?? 0) + 1;
                                $user->save();
                            }
                        }

                        // 過去の予約は会計処理
                        if ($dayOffset < 0 && !$isCancelled) {
                            $amount = collect($selectedMenus)->sum('price');
                            $makeUnpaid =
                                $createUnpaidToday &&
                                $createdUnpaid < $unpaidCount;

                            if ($makeUnpaid) {
                                $createdUnpaid++;

                                $unpaidReservations[] = [
                                    'reservation' => $reservation,
                                    'amount' => $amount,
                                    'method' => $methods[array_rand($methods)],
                                ];
                            } else {
                                // レジ締め後会計：3日に1回・最初の1〜2件・直近2日は除く
                                $isAfterClosing = ($dayOffset % 3 === 0)
                                    && $i <= 1
                                    && $dayOffset < -2;

                                if ($isAfterClosing) {
                                    // 当日レジ締め後（19〜21時）に会計
                                    $paidAt = $date->copy()->setHour(rand(19, 21))->setMinute(rand(0, 59));
                                } else {
                                    $paidAt = $date->copy()->setHour(rand(12, 17))->setMinute(rand(0, 59));
                                }

                                Payment::create([
                                    'reservation_id' => $reservation->id,
                                    'amount' => $amount,
                                    'discount' => 0,
                                    'memo' => $isAfterClosing ? 'レジ締め後に会計' : null,
                                    'method' => $methods[array_rand($methods)],
                                    'paid_at' => $paidAt,
                                    'sales_date' => null,
                                    'daily_closing_id' => null,
                                    'is_draft' => false,
                                ]);
                            }
                        }

                        // 次の予約の開始時刻（0または30分区切り）
                        $totalMin = $endAt->hour * 60 + $endAt->minute + rand(0, 1) * 30;
                        $totalMin = (int) (ceil($totalMin / 30) * 30); // 30分単位に切り上げ
                        $currentHour = (int) floor($totalMin / 60);
                        $currentMin = $totalMin % 60;
                    }
                }

                // 過去の日付はレジ締めを作成
                if ($dayOffset < 0) {
                    $closingTime = $date->copy()->setHour(18)->setMinute(0)->setSecond(0);

                    // 対象payment：当日18時以前 かつ daily_closing_idがnull
                    $paymentQuery = Payment::whereHas('reservation', function ($q) use ($salon) {
                        $q->where('salon_id', $salon->id);
                    })
                        ->whereDate('paid_at', $date->toDateString())
                        ->where('paid_at', '<=', $closingTime)
                        ->where('is_draft', false)
                        ->whereNull('daily_closing_id');

                    // 前日レジ締め後のpaymentも含める
                    if ($prevDailyClosing) {
                        $prevDate = Carbon::parse($prevDailyClosing->closed_at)->toDateString();
                        $afterPrevPayments = Payment::whereHas('reservation', function ($q) use ($salon) {
                            $q->where('salon_id', $salon->id);
                        })
                            ->whereDate('paid_at', $prevDate)
                            ->where('paid_at', '>', $prevDailyClosing->closed_at)
                            ->where('is_draft', false)
                            ->whereNull('daily_closing_id')
                            ->get();
                    } else {
                        $afterPrevPayments = collect();
                    }

                    $payments = $paymentQuery->get()->merge($afterPrevPayments);
                    $totalSales = $payments->sum(fn($p) => max(0, $p->amount - $p->discount));

                    $dailyClosing = DailyClosing::create([
                        'salon_id' => $salon->id,
                        'closed_by' => $staff[0]->id,
                        'date' => $date->toDateString(),
                        'total_sales' => $totalSales,
                        'total_count' => $payments->count(),
                        'memo' => null,
                        'closed_at' => $closingTime,
                    ]);

                    // paymentにdaily_closing_idとsales_dateを付与
                    $paymentQuery->update([
                        'daily_closing_id' => $dailyClosing->id,
                        'sales_date' => $date->toDateString(),
                    ]);

                    // 前日レジ締め後paymentにも付与
                    if ($afterPrevPayments->isNotEmpty()) {
                        Payment::whereIn('id', $afterPrevPayments->pluck('id'))->update([
                            'daily_closing_id' => $dailyClosing->id,
                            'sales_date' => $date->toDateString(),
                        ]);
                    }

                    $prevDailyClosing = $dailyClosing;
                }

                // 前日の未会計を今日の19～21時に会計
                if ($dayOffset === 0) {

                    foreach ($unpaidReservations as $unpaid) {

                        $paidAt = $now->copy()->subDay()->setHour(rand(19, 21))->setMinute(rand(0, 59));

                        Payment::create([
                            'reservation_id' => $unpaid['reservation']->id,
                            'amount' => $unpaid['amount'],
                            'discount' => 0,
                            'memo' => '前日分（レジ締め後に会計）',
                            'method' => $unpaid['method'],
                            'paid_at' => $paidAt,
                            'sales_date' => null,
                            'daily_closing_id' => null,
                            'is_draft' => false,
                        ]);
                    }

                    $unpaidReservations = [];
                }
            }
        }
    }
}
