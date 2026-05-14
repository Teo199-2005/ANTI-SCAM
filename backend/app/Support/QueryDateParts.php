<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Portable SQL fragments for date parts (SQLite vs MySQL/MariaDB).
 */
final class QueryDateParts
{
    public static function monthNumberExpression(string $column = 'created_at'): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%m', {$column}) AS INTEGER)",
            default => "MONTH({$column})",
        };
    }

    /**
     * Group-by expression aligned with {@see monthNumberExpression()}.
     */
    public static function monthNumberGroupExpression(string $column = 'created_at'): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%m', {$column})",
            default => "MONTH({$column})",
        };
    }
}
