<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Modules\Audit\Services\AuditLogService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class VipController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly AuditLogService $audits) {}

    public function setVip(Request $request, Resort $resort)
    {
        $data = $request->validate([
            'is_vip' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $old = ['is_vip' => $resort->is_vip];
        $resort->update(['is_vip' => $data['is_vip']]);

        $this->audits->log(
            $data['is_vip'] ? 'resort_vip_granted' : 'resort_vip_revoked',
            'resort',
            $resort->id,
            $old,
            ['is_vip' => $resort->is_vip],
            null,
            $data['reason'] ?? null
        );

        return $this->successResponse([
            'id'    => $resort->id,
            'isVip' => $resort->is_vip,
        ], 'Resort VIP status updated');
    }
}
