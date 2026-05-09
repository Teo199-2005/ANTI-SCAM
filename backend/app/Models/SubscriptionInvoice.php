<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionInvoice extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'resort_id',
        'xendit_invoice_id',
        'xendit_invoice_url',
        'amount',
        'plan',
        'referral_code',
        'marketer_id',
        'status',
        'billing_cycle_start',
        'billing_cycle_end',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'billing_cycle_start' => 'date',
            'billing_cycle_end' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function resort(): BelongsTo
    {
        return $this->belongsTo(Resort::class);
    }
}

