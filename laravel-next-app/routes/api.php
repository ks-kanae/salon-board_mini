<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\SalonController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\StaffReservationController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\DailyClosingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\SalonClosureController;
use App\Http\Controllers\Api\ScheduleBlockController;

// 認証
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

// パスワードリセット
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password', [PasswordResetController::class, 'reset']);

// ソーシャルログイン
Route::get('/auth/google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
Route::get('/auth/github/redirect', [SocialAuthController::class, 'redirectToGithub']);
Route::get('/auth/github/callback', [SocialAuthController::class, 'handleGithubCallback']);

// メニュー一覧（お客様・スタッフ共通）
Route::get('/salons', [SalonController::class, 'index']);
Route::get('/salons/{salon}/staff', [SalonController::class, 'staff']);
Route::get('/salons/{salon}/closure', [SalonController::class, 'checkClosure']);

Route::get('/salons/{salon}/menus', [MenuController::class, 'index']);

// 認証済み共通
Route::middleware('auth:sanctum')->group(function () {

    // ユーザー情報
    Route::get('/user', [AuthController::class, 'user']);

    // 空き時間確認
    Route::get('/availability', [AvailabilityController::class, 'index']);

    // お客様専用
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
    Route::patch('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);

    // スタッフ専用
    Route::prefix('staff')->group(function () {
        Route::get('/members', [StaffMemberController::class, 'index']);

        Route::get('/menus', [MenuController::class, 'indexAll']);
        Route::post('/menus', [MenuController::class, 'store']);
        Route::put('/menus/{menu}', [MenuController::class, 'update']);
        Route::delete('/menus/{menu}', [MenuController::class, 'destroy']);

        Route::get('/reservations', [StaffReservationController::class, 'index']);
        Route::post('/reservations', [StaffReservationController::class, 'store']);
        Route::get('/reservations/unpaid-past', [StaffReservationController::class, 'unpaidPast']);
        Route::put('/reservations/{reservation}/menus', [StaffReservationController::class, 'updateMenus']);
        Route::patch('/reservations/{reservation}', [StaffReservationController::class, 'update']);
        Route::delete('/reservations/{reservation}', [StaffReservationController::class, 'destroy']);

        Route::patch('/members/{user}/skills', [StaffMemberController::class, 'updateSkills']);

        Route::get('/reservations/{reservation}/payment', [PaymentController::class, 'show']);
        Route::post('/reservations/{reservation}/payment/draft', [PaymentController::class, 'saveDraft']);
        Route::post('/reservations/{reservation}/payment/confirm', [PaymentController::class, 'confirm']);
        Route::delete('/reservations/{reservation}/payment', [PaymentController::class, 'cancel']);

        Route::get('/shifts', [ShiftController::class, 'index']);
        Route::post('/shifts', [ShiftController::class, 'upsert']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

        Route::get('/closing', [DailyClosingController::class, 'show']);
        Route::post('/closing', [DailyClosingController::class, 'store']);
        Route::get('/closings', [DailyClosingController::class, 'index']);
        Route::get('/sales-summary', [DailyClosingController::class, 'salesSummary']);

        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/{user}', [CustomerController::class, 'show']);
        Route::patch('/customers/{user}', [CustomerController::class, 'update']);

        Route::get('/closures', [SalonClosureController::class, 'index']);
        Route::patch('/closures/weekdays', [SalonClosureController::class, 'updateWeekdays']);
        Route::post('/closures/toggle', [SalonClosureController::class, 'toggle']);
        Route::post('/closures/bulk', [SalonClosureController::class, 'bulkSet']);

        Route::get('/schedule-blocks', [ScheduleBlockController::class, 'index']);
        Route::post('/schedule-blocks', [ScheduleBlockController::class, 'store']);
        Route::patch('/schedule-blocks/{scheduleBlock}', [ScheduleBlockController::class, 'update']);
        Route::delete('/schedule-blocks/{scheduleBlock}', [ScheduleBlockController::class, 'destroy']);

        Route::get('/salon', [SalonController::class, 'currentStaffSalon']);
        Route::patch('/salon/hours', [SalonController::class, 'updateHours']);
    });
});
