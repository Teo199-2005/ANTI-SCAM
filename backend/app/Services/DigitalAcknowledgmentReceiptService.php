<?php

namespace App\Services;

use App\Models\DigitalReceiptSequence;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Allocates platform-wide digital acknowledgment receipt numbers:
 * ASPH-BKG-{year}-{000001} (reservation fee), ASPH-SUB-{year}-{000001} (subscription invoice).
 */
final class DigitalAcknowledgmentReceiptService
{
    public const KIND_BOOKING = 'BKG';

    public const KIND_SUBSCRIPTION = 'SUB';

    /**
     * @param  self::KIND_*  $kind
     */
    public function allocate(string $kind, \DateTimeInterface $paidAt): string
    {
        if (! in_array($kind, [self::KIND_BOOKING, self::KIND_SUBSCRIPTION], true)) {
            throw new InvalidArgumentException('Receipt kind must be BKG or SUB.');
        }

        $year = (int) $paidAt->format('Y');

        return DB::transaction(function () use ($kind, $year): string {
            $row = DigitalReceiptSequence::query()
                ->where('kind', $kind)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                try {
                    DigitalReceiptSequence::create([
                        'kind' => $kind,
                        'year' => $year,
                        'last_sequence' => 1,
                    ]);

                    return $this->format($kind, $year, 1);
                } catch (QueryException $e) {
                    if (! $this->isUniqueConstraintViolation($e)) {
                        throw $e;
                    }

                    $row = DigitalReceiptSequence::query()
                        ->where('kind', $kind)
                        ->where('year', $year)
                        ->lockForUpdate()
                        ->firstOrFail();
                }
            }

            $row->increment('last_sequence');
            $seq = (int) $row->fresh()->last_sequence;

            return $this->format($kind, $year, $seq);
        });
    }

    private function format(string $kind, int $year, int $sequence): string
    {
        return sprintf('ASPH-%s-%d-%06d', $kind, $year, $sequence);
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        $code = $e->getCode();
        $message = strtolower($e->getMessage());

        // SQLite: 19 = constraint failed; SQLSTATE 23000
        if ($code === '23000' || $code === 23000) {
            return true;
        }

        if ($code === 19 || $code === '19') {
            return true;
        }

        return str_contains($message, 'unique constraint')
            || str_contains($message, 'duplicate entry')
            || str_contains($message, 'integrity constraint violation');
    }
}
