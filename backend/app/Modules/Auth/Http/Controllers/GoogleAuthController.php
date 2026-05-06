<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse|Response
    {
        if (! config('services.google.client_id')) {
            abort(503, 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
        }

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
                'role' => 'user',
                'email_verified_at' => now(),
            ]);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        // Redirect to the Next.js BFF callback route which sets an httpOnly cookie.
        // The token is passed as a query param and immediately stored server-side — never
        // returned to JavaScript or the browser history.
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $url = $frontend.'/api/auth/google-callback?token='.rawurlencode($token);

        return redirect()->away($url);
    }
}
