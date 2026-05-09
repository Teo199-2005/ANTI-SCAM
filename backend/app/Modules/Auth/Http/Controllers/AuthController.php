<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailVerificationOtpService;
use App\Services\PasswordResetOtpService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly EmailVerificationOtpService $emailOtpService,
        private readonly PasswordResetOtpService $passwordResetOtpService,
    ) {
    }

    public function register(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email:rfc,dns', 'max:190', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'business_name' => ['nullable', 'string', 'max:190'],
            'role_intent' => ['nullable', 'in:resort_owner,client'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->uncompromised(),
            ],
        ]);

        $roleIntent = $validated['role_intent'] ?? 'resort_owner';

        $user  = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'phone'    => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            // Allows checkout flow to create client accounts safely.
            'role'     => $roleIntent,
        ]);

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse(['user' => $user, 'token' => $token], 'Account created', 201);
    }

    public function login(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Case-insensitive match (handles legacy rows) and consistent with normalized registration email.
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$validated['email']])
            ->first();

        if (! $user) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $hash = $user->getAuthPassword();
        if ($hash === '' || $hash === null) {
            throw ValidationException::withMessages([
                'email' => ['This account has no password set. Sign in with Google or use Forgot password if available.'],
            ]);
        }

        if (! Hash::check($validated['password'], $hash)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse(['user' => $user, 'token' => $token], 'Authenticated');
    }

    public function forgotPasswordRequest(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);
        $email = mb_strtolower(trim($validated['email']));
        $result = $this->passwordResetOtpService->sendForEmail($email);

        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Unable to send reset code.', null, 422);
        }

        return $this->successResponse(
            [
                'expires_at' => $result['expires_at'] ?? null,
                'cooldown_seconds' => $result['cooldown_seconds'] ?? null,
            ],
            $result['message'] ?? 'Check your email for a reset code.'
        );
    }

    public function forgotPasswordReset(Request $request)
    {
        $request->merge([
            'email' => mb_strtolower(trim((string) $request->input('email', ''))),
        ]);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->uncompromised(),
            ],
        ]);

        $result = $this->passwordResetOtpService->verifyAndResetPassword(
            $validated['email'],
            (string) $validated['otp'],
            (string) $validated['password'],
        );

        if (! ($result['ok'] ?? false)) {
            throw ValidationException::withMessages([
                'otp' => [$result['message'] ?? 'Reset failed.'],
            ]);
        }

        return $this->successResponse(null, $result['message'] ?? 'Password updated.');
    }

    public function me(Request $request)
    {
        return $this->successResponse($request->user(), 'Current user');
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->successResponse(null, 'Logged out');
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:190', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user->update($validated);

        return $this->successResponse($user->fresh(), 'Profile updated');
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->uncompromised(),
            ],
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all other tokens so existing sessions are invalidated after a password change.
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return $this->successResponse(null, 'Password changed successfully');
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();

        // Delete previous avatar if it was a stored file.
        if ($user->avatar_url && str_starts_with($user->avatar_url, '/storage/')) {
            $oldPath = str_replace('/storage/', 'public/', $user->avatar_url);
            Storage::delete($oldPath);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_url' => '/storage/' . $path]);

        return $this->successResponse(['avatar_url' => $user->avatar_url], 'Avatar updated');
    }

    public function sendEmailVerificationOtp(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthorized.', null, 401);
        }

        if (! in_array($user->role, ['resort_owner', 'marketing'], true)) {
            return $this->errorResponse('OTP verification is only required for resort owners and marketing partners.', null, 403);
        }

        if ($user->email_verified_at) {
            return $this->successResponse(['already_verified' => true], 'Email already verified.');
        }

        $result = $this->emailOtpService->send($user);
        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Failed to send verification code.', null, 422);
        }

        return $this->successResponse([
            'expires_at' => $result['expires_at'] ?? null,
            'cooldown_seconds' => $result['cooldown_seconds'] ?? null,
        ], $result['message'] ?? 'Verification code sent.');
    }

    public function verifyEmailVerificationOtp(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthorized.', null, 401);
        }

        if (! in_array($user->role, ['resort_owner', 'marketing'], true)) {
            return $this->errorResponse('OTP verification is only required for resort owners and marketing partners.', null, 403);
        }

        $validated = $request->validate([
            'otp' => ['required', 'digits:6'],
        ]);

        $result = $this->emailOtpService->verify($user, (string) $validated['otp']);
        if (! ($result['ok'] ?? false)) {
            return $this->errorResponse($result['message'] ?? 'Verification failed.', null, 422);
        }

        return $this->successResponse([
            'user' => $user->fresh(),
        ], $result['message'] ?? 'Email verified successfully.');
    }
}
