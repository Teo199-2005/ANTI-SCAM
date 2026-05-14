<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Per-year sequential counter for {@see DigitalAcknowledgmentReceiptService}.
 *
 * @property int $id
 * @property string $kind BKG | SUB
 * @property int $year
 * @property int $last_sequence
 */
class DigitalReceiptSequence extends Model
{
    protected $fillable = [
        'kind',
        'year',
        'last_sequence',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'last_sequence' => 'integer',
        ];
    }
}
