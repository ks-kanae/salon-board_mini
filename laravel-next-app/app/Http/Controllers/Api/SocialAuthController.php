<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    // Googleリダイレクト
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    // Googleコールバック
    public function handleGoogleCallback(Request $request)
    {
        try {
            $socialUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect(env('FRONTEND_URL') . '/login?social=error');
        }

        return $this->loginOrCreateUser($request, $socialUser->getEmail(), $socialUser->getName());
    }

    // GitHubリダイレクト
    public function redirectToGithub()
    {
        return Socialite::driver('github')->stateless()->redirect();
    }

    // GitHubコールバック
    public function handleGithubCallback(Request $request)
    {
        try {
            $socialUser = Socialite::driver('github')->stateless()->user();
        } catch (\Exception $e) {
            return redirect(env('FRONTEND_URL') . '/login?social=error');
        }

        $name = $socialUser->getName() ?? $socialUser->getNickname();
        return $this->loginOrCreateUser($request, $socialUser->getEmail(), $name);
    }

    // ユーザーを取得または作成してログイン
    private function loginOrCreateUser(Request $request, string $email, string $name)
    {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => bcrypt(Str::random(24)),
            ]
        );

        Auth::login($user);
        $request->session()->regenerate();

        return redirect(env('FRONTEND_URL') . '/?social=success');
    }
}
