<?php

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Modules\Audit\Services\AuditLogService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\YoutubeVideoId;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminResortLandingEmbedController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly AuditLogService $audits) {}

    public function update(Request $request, Resort $resort)
    {
        $data = $request->validate([
            'admin_landing_embed_enabled' => ['required', 'boolean'],
            'admin_landing_youtube_url' => ['nullable', 'string', 'max:500'],
        ]);

        $enabled = $data['admin_landing_embed_enabled'];
        $rawUrl = $data['admin_landing_youtube_url'] ?? null;
        $rawUrl = is_string($rawUrl) ? trim($rawUrl) : null;
        if ($rawUrl === '') {
            $rawUrl = null;
        }

        if ($enabled && ! YoutubeVideoId::parse($rawUrl)) {
            throw ValidationException::withMessages([
                'admin_landing_youtube_url' => ['Enter a valid YouTube link or video ID when the intro video is enabled.'],
            ]);
        }

        $old = [
            'admin_landing_embed_enabled' => (bool) $resort->admin_landing_embed_enabled,
            'admin_landing_youtube_url' => $resort->admin_landing_youtube_url,
        ];

        $resort->admin_landing_embed_enabled = $enabled;

        if ($enabled) {
            $resort->admin_landing_youtube_url = $rawUrl;
        } elseif ($request->exists('admin_landing_youtube_url')) {
            $resort->admin_landing_youtube_url = $rawUrl;
        }

        $resort->save();

        $this->audits->log(
            'resort_admin_landing_embed_updated',
            'resort',
            $resort->id,
            $old,
            [
                'admin_landing_embed_enabled' => (bool) $resort->admin_landing_embed_enabled,
                'admin_landing_youtube_url' => $resort->admin_landing_youtube_url,
            ],
            null,
            null
        );

        return $this->successResponse([
            'id' => $resort->id,
            'admin_landing_embed_enabled' => (bool) $resort->admin_landing_embed_enabled,
            'admin_landing_youtube_url' => $resort->admin_landing_youtube_url,
        ], 'Landing intro video settings updated');
    }
}
