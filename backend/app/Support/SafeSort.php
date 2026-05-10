<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

final class SafeSort
{
    /**
     * @param  array<int, string>  $allowed
     */
    public static function apply(
        Builder $query,
        ?string $sortBy,
        ?string $sortDir,
        array $allowed,
        string $defaultColumn,
        string $defaultDir = 'desc',
    ): void {
        $sortByTrim = $sortBy !== null ? trim($sortBy) : '';
        $valid = $sortByTrim !== '' && in_array($sortByTrim, $allowed, true);
        $col = $valid ? $sortByTrim : $defaultColumn;
        if (! in_array($col, $allowed, true)) {
            $col = $defaultColumn;
        }

        $dir = $valid
            ? (strtolower((string) $sortDir) === 'asc' ? 'asc' : 'desc')
            : (strtolower($defaultDir) === 'asc' ? 'asc' : 'desc');

        $query->orderBy($col, $dir);
    }
}
