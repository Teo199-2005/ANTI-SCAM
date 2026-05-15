<?php

namespace Tests\Unit;

use App\Support\XenditInvoiceWebhookStatus;
use PHPUnit\Framework\TestCase;

class XenditInvoiceWebhookStatusTest extends TestCase
{
    public function test_is_paid_accepts_invoice_status_event(): void
    {
        $this->assertTrue(XenditInvoiceWebhookStatus::isPaid([
            'status' => 'PAID',
            'event' => 'invoice.status',
        ]));
    }

    public function test_is_paid_accepts_invoice_paid_event(): void
    {
        $this->assertTrue(XenditInvoiceWebhookStatus::isPaid([
            'status' => 'PAID',
            'event' => 'invoice.paid',
        ]));
    }

    public function test_is_expired_for_invoice_status(): void
    {
        $this->assertTrue(XenditInvoiceWebhookStatus::isExpiredOrFailed([
            'status' => 'EXPIRED',
            'event' => 'invoice.status',
        ]));
    }
}
