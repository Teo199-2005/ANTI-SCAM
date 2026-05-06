<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponseTrait;

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email:rfc,dns', 'max:190', 'unique:users,email'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->uncompromised(),
            ],
        ]);

        $user  = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => 'user',
        ]);

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse(['user' => $user, 'token' => $token], 'Account created', 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $token = $user->createToken('spa-token')->plainTextToken;

        return $this->successResponse(['user' => $user, 'token' => $token], 'Authenticated');
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
}
