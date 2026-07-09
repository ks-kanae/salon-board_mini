<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Http\Controllers\ProductController;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/products', [ProductController::class, 'index']);

// ユーザー登録
Route::post('/register', function (Request $request) {
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => bcrypt($validated['password']),
    ]);

    Auth::login($user);
    $request->session()->regenerate();

    return response()->json($user, 201);
});


/*ログイン*/
Route::post("/login", function (Request $request) {
    $credentials = $request->validate([
        "email" => ["required", "email"],
        "password" => ["required"],
    ]);

    if (!Auth::attempt($credentials)) {
        throw ValidationException::withMessages([
            'email' => ['メールアドレスまたはパスワードが正しくありません。'],
        ]);
    }

    $request->session()->regenerate();

    return response()->json(Auth::user());
});

// ログアウト
Route::post("/logout", function (Request $request) {
    Auth::guard("web")->logout();

    $request->session()->invalidate();

    $request->session()->regenerateToken();

    return response()->noContent();
});

// 認証が必要なルート
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// パスワードリセットメールの送信
Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => ['required', 'email']]);

    $status = Password::sendResetLink(
        $request->only('email')
    );

    if ($status === Password::RESET_LINK_SENT) {
        return response()->json(['message' => __($status)]);
    }

    throw ValidationException::withMessages([
        'email' => [__($status)],
    ]);
});

// 新しいパスワードへの更新
Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token' => ['required'],
        'email' => ['required', 'email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $status = Password::reset(
        $request->only('email', 'password', 'password_confirmation', 'token'),
        function ($user, $password) {
            $user->forceFill([
                'password' => Hash::make($password),
            ])->setRememberToken(Str::random(60));

            $user->save();

            event(new PasswordReset($user));
        }
    );

    if ($status === Password::PASSWORD_RESET) {
        return response()->json(['message' => __($status)]);
    }

    throw ValidationException::withMessages([
        'email' => [__($status)],
    ]);
});

// Google
Route::get('/auth/google/redirect', function () {
    return Socialite::driver('google')->stateless()->redirect();
});

Route::get('/auth/google/callback', function (Request $request) {
    try {
        $googleUser = Socialite::driver('google')->stateless()->user();
    } catch (\Exception $e) {
        return redirect(env('FRONTEND_URL') . '/login?social=error');
    }

    $user = User::updateOrCreate(
        ['email' => $googleUser->getEmail()],
        [
            'name' => $googleUser->getName(),
            'password' => bcrypt(Str::random(24)),
        ]
    );

    Auth::login($user);
    $request->session()->regenerate();

    return redirect(env('FRONTEND_URL') . '/?social=success');
});

// GitHub
Route::get('/auth/github/redirect', function () {
    return Socialite::driver('github')->stateless()->redirect();
});

Route::get('/auth/github/callback', function (Request $request) {
    try {
        $githubUser = Socialite::driver('github')->stateless()->user();
    } catch (\Exception $e) {
        return redirect(env('FRONTEND_URL') . '/login?social=error');
    }

    $user = User::updateOrCreate(
        ['email' => $githubUser->getEmail()],
        [
            'name' => $githubUser->getName() ?? $githubUser->getNickname(),
            'password' => bcrypt(Str::random(24)),
        ]
    );

    Auth::login($user);
    $request->session()->regenerate();

    return redirect(env('FRONTEND_URL') . '/?social=success');
});
