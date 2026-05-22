<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\FrontendOriginResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse|Response
    {
        if (! config('services.google.client_id')) {
            abort(503, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
        }

        $returnTo = trim((string) $request->query('returnTo', ''));
        if ($returnTo !== '' && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
            $request->session()->put('google_auth_return_to', $returnTo);
        }

        $frontendBase = app(FrontendOriginResolver::class)->resolve($request);
        $request->session()->put('google_auth_frontend_base', $frontendBase);

        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->user();

        $email = $googleUser->getEmail();
        if (! $email) {
            abort(422, 'Google did not return an email for this account.');
        }

        $user = User::query()->where('google_id', $googleUser->getId())->first();

        if (! $user) {
            $user = User::query()->where('email', $email)->first();
            if ($user) {
                $user->forceFill(['google_id' => $googleUser->getId()])->save();
            }
        }

        if (! $user) {
            $name = $googleUser->getName()
                ?: $googleUser->getNickname()
                ?: Str::before($email, '@');

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleUser->getId(),
                'password' => Hash::make(Str::random(48)),
                'role' => 'client',
                'email_verified_at' => now(),
            ]);
        } elseif (in_array($user->role, ['guest', 'user'], true)) {
            $user->forceFill(['role' => 'client', 'home_resort_id' => null])->save();
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        $returnTo = (string) request()->session()->pull('google_auth_return_to', '');
        if ($returnTo === '' || ! str_starts_with($returnTo, '/') || str_starts_with($returnTo, '//')) {
            $returnTo = in_array($user->role, ['client', 'user', 'guest'], true)
                ? '/dashboard/client'
                : '/dashboard';
        }

        $sessionBase = (string) request()->session()->pull('google_auth_frontend_base', '');
        $frontend = $sessionBase !== ''
            ? rtrim($sessionBase, '/')
            : app(FrontendOriginResolver::class)->resolve(request());
        $url = $frontend.'/api/auth/google-callback?token='.rawurlencode($token)
            .'&redirect='.rawurlencode($returnTo);

        return redirect()->away($url);
    }
}
