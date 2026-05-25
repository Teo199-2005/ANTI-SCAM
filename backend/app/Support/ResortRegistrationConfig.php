<?php

declare(strict_types=1);

namespace App\Support;

final class ResortRegistrationConfig
{
    public static function wizardEnabled(): bool
    {
        return (bool) config('resort_registration.wizard_enabled', true);
    }
}
