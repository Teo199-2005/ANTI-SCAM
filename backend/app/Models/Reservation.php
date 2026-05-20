<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    use BelongsToTenant;

    /**
     * Reservation rows whose fees and gross booking totals count toward revenue / KPIs.
     * Excludes cancelled, expired, and unpaid pending — e.g. a paid-then-cancelled row must not inflate totals.
     *
     * @var list<string>
     */
    public const REVENUE_ELIGIBLE_STATUSES = ['confirmed', 'completed', 'no_show'];

    /** Statuses the resort may cancel when removing a guest from the directory. */
    public const CANCELLABLE_STATUSES = ['pending_payment', 'confirmed'];

    /** Comma-separated quoted literals for raw SQL `IN (...)` fragments. */
    public static function revenueEligibleStatusesSqlList(): string
    {
        return implode(',', array_map(
            static fn (string $s): string => "'{$s}'",
            self::REVENUE_ELIGIBLE_STATUSES
        ));
    }

    /** @param  Builder<Reservation>  $query */
    public function scopeRevenueEligible(Builder $query): Builder
    {
        return $query->whereIn('status', self::REVENUE_ELIGIBLE_STATUSES);
    }

    /**
     * Confirmed stays plus pending_payment rows still inside the online payment hold window.
     *
     * @param  Builder<Reservation>  $query
     * @return Builder<Reservation>
     */
    public function scopeOccupyingInventory(Builder $query): Builder
    {
        $cutoff = now()->subMinutes(max(1, (int) config('booking.payment_hold_minutes', 10)));

        return $query->where(function (Builder $outer) use ($cutoff): void {
            $outer->where('status', 'confirmed')
                ->orWhere(function (Builder $pending) use ($cutoff): void {
                    $pending->where('status', 'pending_payment')
                        ->where(function (Builder $hold) use ($cutoff): void {
                            $hold->where('reserved_at', '>=', $cutoff)
                                ->orWhere(function (Builder $fallback) use ($cutoff): void {
                                    $fallback->whereNull('reserved_at')
                                        ->where('created_at', '>=', $cutoff);
                                });
                        });
                });
        });
    }

    protected $fillable = [
        'tenant_id',
        'resort_id',
        'room_id',
        'booking_lock_id',
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
