<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GooglePendingSignupService;
use App\Support\FrontendOriginResolver;
use App\Support\GoogleOAuthState;
use App\Support\ProductionFrontendUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $safeReturnTo = null;
        if ($returnTo !== '' && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
            $safeReturnTo = $returnTo;
            $request->session()->put('google_auth_return_to', $returnTo);
        }

        $frontendBase = ProductionFrontendUrl::sanitize(
            app(FrontendOriginResolver::class)->resolve($request),
            $request,
        );
        $request->session()->put('google_auth_frontend_base', $frontendBase);

        $oauthState = GoogleOAuthState::encode($safeReturnTo, $frontendBase);

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $oauthState])
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

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

            $pendingToken = app(GooglePendingSignupService::class)->issue(
                (string) $googleUser->getId(),
                $email,
                $name,
            );

            $request = request();
            $decoded = GoogleOAuthState::decode($request->query('state'));
            $frontend = '';
            if (is_array($decoded) && is_string($decoded['frontend'] ?? null) && $decoded['frontend'] !== '') {
                $frontend = $decoded['frontend'];
            }
            if ($frontend === '') {
                $frontend = (string) $request->session()->pull('google_auth_frontend_base', '');
            }
            if ($frontend === '') {
                $frontend = app(FrontendOriginResolver::class)->resolve($request);
            }
            $frontend = ProductionFrontendUrl::sanitize(rtrim($frontend, '/'), $request);

            $returnTo = '';
            if (is_array($decoded) && is_string($decoded['return_to'] ?? null) && $decoded['return_to'] !== '') {
                $returnTo = $decoded['return_to'];
            }
            if ($returnTo === '') {
                $returnTo = (string) $request->session()->pull('google_auth_return_to', '');
            }
            $chooseRoleUrl = $frontend.'/register/choose-role?google_token='.rawurlencode($pendingToken);
            if ($returnTo !== '' && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
                $chooseRoleUrl .= '&returnTo='.rawurlencode($returnTo);
            }

            return redirect()->away($chooseRoleUrl);
        } elseif (in_array($user->role, ['guest', 'user'], true)) {
            $user->forceFill(['role' => 'client', 'home_resort_id' => null])->save();
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        $request = request();
        $decoded = GoogleOAuthState::decode($request->query('state'));

        $returnTo = '';
        if (is_array($decoded) && is_string($decoded['return_to'] ?? null) && $decoded['return_to'] !== '') {
            $returnTo = $decoded['return_to'];
        }
        if ($returnTo === '') {
            $returnTo = (string) $request->session()->pull('google_auth_return_to', '');
        }
        if ($returnTo === '' || ! str_starts_with($returnTo, '/') || str_starts_with($returnTo, '//')) {
            $returnTo = in_array($user->role, ['client', 'user', 'guest'], true)
                ? '/dashboard/client'
                : '/dashboard';
        }

        $frontend = '';
        if (is_array($decoded) && is_string($decoded['frontend'] ?? null) && $decoded['frontend'] !== '') {
            $frontend = $decoded['frontend'];
        }
        if ($frontend === '') {
            $frontend = (string) $request->session()->pull('google_auth_frontend_base', '');
        }
        if ($frontend === '') {
            $frontend = app(FrontendOriginResolver::class)->resolve($request);
        }

        $frontend = ProductionFrontendUrl::sanitize(rtrim($frontend, '/'), $request);

        $url = $frontend.'/api/auth/google-callback?token='.rawurlencode($token)
            .'&redirect='.rawurlencode($returnTo);

        return redirect()->away($url);
    }
}
