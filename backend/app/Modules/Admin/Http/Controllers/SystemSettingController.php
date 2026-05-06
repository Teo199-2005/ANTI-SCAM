<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Modules\Audit\Services\AuditLogService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly AuditLogService $audits) {}

    public function index()
    {
        return $this->successResponse(
            SystemSetting::all(['key', 'value', 'type', 'description']),
            'System settings fetched'
        );
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings'                => ['required', 'array'],
            'settings.*.key'          => ['required', 'string', 'exists:system_settings,key'],
            'settings.*.value'        => ['required', 'string'],
        ]);

        foreach ($data['settings'] as $item) {
            $setting = SystemSetting::where('key', $item['key'])->first();
            $old = $setting->value;
            $setting->update(['value' => $item['value']]);
            $this->audits->log('system_setting_updated', 'system_setting', $setting->id, ['value' => $old], ['value' => $item['value']]);
        }

        return $this->successResponse(null, 'Settings updated');
    }
}
