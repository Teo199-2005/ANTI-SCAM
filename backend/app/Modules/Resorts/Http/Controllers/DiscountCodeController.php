<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DiscountCode;
use App\Models\Resort;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;

class DiscountCodeController extends Controller
{
    use ApiResponseTrait;

    public function index(Resort $resort)
    {
        $this->authorizeResort($resort);
        $codes = DiscountCode::where('resort_id', $resort->id)->latest()->get();
        return $this->successResponse($codes, 'Discount codes fetched');
    }

    public function store(Request $request, Resort $resort)
    {
        $this->authorizeResort($resort);

        $data = $request->validate([
            'code'        => ['required', 'string', 'max:60'],
            'type'        => ['required', 'in:fixed,percent'],
            'value'       => ['required', 'numeric', 'min:0'],
            'max_uses'    => ['nullable', 'integer', 'min:1'],
            'valid_from'  => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active'   => ['boolean'],
        ]);

        $tenantId = TenantContext::tenantId() ?? auth()->user()?->tenant_id;
        if (! $tenantId) {
            abort(422, 'Tenant context is missing.');
        }

        $code = DiscountCode::create(array_merge($data, [
            'resort_id' => $resort->id,
            'tenant_id' => $tenantId,
        ]));

        return $this->successResponse($code, 'Discount code created', 201);
    }

    public function update(Request $request, Resort $resort, DiscountCode $code)
    {
        $this->authorizeResort($resort);
        $this->authorizeCode($resort, $code);

        $data = $request->validate([
            'code'        => ['sometimes', 'string', 'max:60'],
            'type'        => ['sometimes', 'in:fixed,percent'],
            'value'       => ['sometimes', 'numeric', 'min:0'],
            'max_uses'    => ['nullable', 'integer', 'min:1'],
            'valid_from'  => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'is_active'   => ['boolean'],
        ]);

        $code->update($data);
        return $this->successResponse($code->refresh(), 'Discount code updated');
    }

    public function destroy(Resort $resort, DiscountCode $code)
    {
        $this->authorizeResort($resort);
        $this->authorizeCode($resort, $code);
        $code->delete();
        return $this->successResponse(null, 'Discount code deleted');
    }

    /** Validate a code at checkout. */
    public function validateCode(Request $request)
    {
        $request->validate([
            'code'      => ['required', 'string'],
            'resort_id' => ['required', 'integer'],
            'amount'    => ['required', 'numeric', 'min:0'],
        ]);

        $code = DiscountCode::where('resort_id', $request->resort_id)
            ->where('code', strtoupper($request->code))
            ->first();

        if (! $code || ! $code->isValid()) {
            return $this->errorResponse('Invalid or expired discount code.', null, 422);
        }

        $discounted = $code->apply((float) $request->amount);

        return $this->successResponse([
            'code'           => $code->code,
            'type'           => $code->type,
            'value'          => $code->value,
            'originalAmount' => $request->amount,
            'discountedAmount' => $discounted,
            'saving'         => round($request->amount - $discounted, 2),
        ], 'Discount code valid');
    }

    private function authorizeResort(Resort $resort): void
    {
        $user = auth()->user();
        if ($user->role === 'admin') return;

        // Prefer TenantContext (subdomain), fall back to user's own tenant_id
        $tenantId = TenantContext::tenantId() ?? $user->tenant_id;
        if ($tenantId && $resort->tenant_id !== $tenantId) {
            abort(403, 'Access denied.');
        }
    }

    private function authorizeCode(Resort $resort, DiscountCode $code): void
    {
        if ($code->resort_id !== $resort->id) {
            abort(404, 'Discount code not found for this resort.');
        }
    }
}
