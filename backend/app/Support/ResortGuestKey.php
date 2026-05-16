<?php

namespace App\Support;

/**
 * Stable guest identity key used in {@see \App\Modules\Resorts\Http\Controllers\ResortGuestController}
 * and reservation history queries.
 */
final class ResortGuestKey
{
    /**
     * SQL fragment referencing `reservations` and left-joined `users` (alias `users`).
     */
    public static function sqlExpression(): string
    {
        return 'COALESCE(LOWER(NULLIF(reservations.guest_email, \'\')), LOWER(NULLIF(users.email, \'\')), CAST(reservations.client_id AS CHAR), CAST(reservations.id AS CHAR))';
    }

    /**
     * Reservations anonymized after guest removal (no longer a directory row).
     */
    public static function isAnonymizedDirectoryRowSql(): string
    {
        return "(reservations.guest_name = 'Removed guest' AND NULLIF(reservations.guest_email, '') IS NULL AND reservations.client_id IS NULL)";
    }
}
