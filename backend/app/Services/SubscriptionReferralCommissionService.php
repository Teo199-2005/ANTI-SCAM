<?php

namespace App\Services;

use App\Models\SubscriptionInvoice;

/**
 * @deprecated Replaced by {@see BookingReferralCommissionService} (flat PHP per paid online booking).
 */
class SubscriptionReferralCommissionService
{
    /**
     * No-op: subscription invoice payments do not credit marketer commission.
     */
    public function creditFromPaidMonthlyInvoice(SubscriptionInvoice $invoice): void
    {
    }
}
