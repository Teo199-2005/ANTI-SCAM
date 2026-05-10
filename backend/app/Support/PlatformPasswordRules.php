<?php

namespace App\Support;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Single source of truth for end-user password strength (registration, reset, admin-created users).
 */
final class PlatformPasswordRules
{
    /**
     * @return list<Rule|string>
     */
    public static function requiredWithConfirmation(): array
    {
        return [
            'required',
            'confirmed',
            Password::min(8)->mixedCase()->numbers()->uncompromised(),
        ];
    }

    /**
     * @return list<Rule|string>
     */
    public static function optionalWithConfirmation(): array
    {
        return [
            'nullable',
            'confirmed',
            Password::min(8)->mixedCase()->numbers()->uncompromised(),
        ];
    }
}
