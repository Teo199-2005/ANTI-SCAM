<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Modules\Audit\Services\AuditLogService;
use App\Services\MarketingBookingCommissionSettingsService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SystemSettingController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly AuditLogService $audits,
        private readonly MarketingBookingCommissionSettingsService $bookingCommissionSettings,
    ) {}

    public function index()
    {
        $rows = SystemSetting::all(['key', 'value', 'type', 'description']);

        return $this->successResponse([
            'settings' => $rows,
            'marketing_commission_policy_note' => $this->bookingCommissionSettings->policyNote(),
        ], 'System settings fetched');
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'exists:system_settings,key'],
            'settings.*.value' => ['required', 'string'],
        ]);

        foreach ($data['settings'] as $item) {
            $key = $item['key'];
            $rawValue = $item['value'];

            try {
                $storedValue = match ($key) {
                    MarketingBookingCommissionSettingsService::KEY_AMOUNT_PHP =>
                        $this->bookingCommissionSettings->validateAmountForStorage($rawValue),
                    MarketingBookingCommissionSettingsService::KEY_ENABLED =>
                        $this->bookingCommissionSettings->validateEnabledForStorage($rawValue),
                    default => $rawValue,
                };
            } catch (InvalidArgumentException $e) {
                return $this->errorResponse($e->getMessage(), ['key' => $key], 422);
            }

            $setting = SystemSetting::where('key', $key)->first();
            $old = $setting->value;
            $setting->update(['value' => $storedValue]);
            $this->audits->log('system_setting_updated', 'system_setting', $setting->id, ['value' => $old], ['value' => $storedValue]);
        }

        return $this->successResponse([
            'marketing_commission_policy_note' => $this->bookingCommissionSettings->policyNote(),
        ], 'Settings updated. Booking commission changes apply to new credits only.');
    }
}
