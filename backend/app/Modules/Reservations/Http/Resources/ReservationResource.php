<?php

namespace App\Modules\Reservations\Http\Resources;

use App\Services\PhilippineLocationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $loc = app(PhilippineLocationService::class);

        return [
            'id' => $this->id,
            'referenceNo' => $this->reference_no,
            'resortId' => $this->resort_id,
            'roomId' => $this->room_id,
            'clientId' => $this->client_id,
            'checkInDate' => $this->check_in_date?->toDateString(),
            'checkOutDate' => $this->check_out_date?->toDateString(),
            'guestCount' => $this->guest_count,
            'reservationFee' => $this->reservation_fee,
            'totalAmount' => $this->total_amount,
            'status' => $this->status,
            'xenditPaymentStatus' => $this->xendit_payment_status,
            'xenditInvoiceId' => $this->xendit_invoice_id,
            'createdAt' => $this->created_at?->toISOString(),
            'reservedAt' => $this->reserved_at?->toISOString(),
            'cancelledAt' => $this->cancelled_at?->toISOString(),
            'cancellationReason' => $this->cancellation_reason,
            'refundStatus' => $this->refund_status,
            'resort' => $this->when(
                $this->relationLoaded('resort') && $this->resort !== null,
                fn (): array => [
                    'id' => $this->resort->id,
                    'name' => $this->resort->name,
                    'address' => $loc->resortDisplayLine($this->resort),
                ],
            ),
            'room' => $this->when(
                $this->relationLoaded('room') && $this->room !== null,
                fn (): array => [
                    'id' => $this->room->id,
                    'name' => $this->room->name,
                ],
            ),
        ];
    }
}
