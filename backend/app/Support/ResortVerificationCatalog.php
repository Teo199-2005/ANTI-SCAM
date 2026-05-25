<?php

declare(strict_types=1);

namespace App\Support;

final class ResortVerificationCatalog
{
    /** @return list<string> */
    public static function statuses(): array
    {
        return ['pending', 'verified', 'rejected', 'needs_documents'];
    }

    public static function ownerMustResubmit(string $status): bool
    {
        return in_array($status, ['rejected', 'needs_documents'], true);
    }
}
