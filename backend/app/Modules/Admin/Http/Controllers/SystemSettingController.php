<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * SystemSettingController stubbed out — system settings management removed.
 * This controller intentionally returns a 410 Gone for now to avoid accidental use.
 */
class SystemSettingController extends Controller
{
    public function index()
    {
        return response()->json(['message' => 'System settings endpoint removed.'], 410);
    }

    public function update(Request $request)
    {
        return response()->json(['message' => 'System settings endpoint removed.'], 410);
    }
}
