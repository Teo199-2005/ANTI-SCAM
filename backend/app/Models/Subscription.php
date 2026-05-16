<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'resort_id',
        'plan',
        'base_price',
        'included_rooms',
        'extra_room_fee',
        'active_room_count',
        'total_monthly_fee',
        'billing_cycle_start',
        'billing_cycle_end',
        'next_due_date',
        'grace_until',
        'status',
        'billing_mode',
        'renewal_duration_months',
        'xendit_customer_id',
        'xendit_recurring_plan_id',
        'xendit_payment_method_id',
        'recurring_activated_at',
        'recurring_cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'billing_cycle_start' => 'date',
            'billing_cycle_end' => 'date',
            'next_due_date' => 'date',
            'grace_until' => 'date',
            'renewal_duration_months' => 'integer',
            'recurring_activated_at' => 'datetime',
            'recurring_cancelled_at' => 'datetime',
            'base_price' => 'decimal:2',
            'extra_room_fee' => 'decimal:2',
            'total_monthly_fee' => 'decimal:2',
        ];
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }
}
