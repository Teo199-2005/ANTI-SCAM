<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'resort_id',
        'room_id',
        'client_id',
        'booking_source',
        'guest_name',
        'guest_email',
        'guest_phone',
        'reference_no',
        'acknowledgment_receipt_no',
        'check_in_date',
        'check_out_date',
        'guest_count',
        'reservation_fee',
        'total_amount',
        'status',
        'xendit_invoice_id',
        'xendit_payment_status',
        'reserved_at',
        'cancelled_at',
        'cancellation_reason',
        'refund_status',
    ];

    protected function casts(): array
    {
        return [
            'check_in_date' => 'date',
            'check_out_date' => 'date',
            'reserved_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'reservation_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function staffNotes(): HasMany
    {
        return $this->hasMany(StaffNote::class);
    }

    public function policyAcknowledgments(): HasMany
    {
        return $this->hasMany(PolicyAcknowledgment::class);
    }
}
