<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Services\LandingReadinessService;
use App\Services\PlanFeatureResolver;
use App\Support\SubscriptionPlan;
use App\Support\YoutubeVideoId;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\MultipartUploadHints;
use App\Support\StoredMedia;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ResortLandingPageController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly LandingReadinessService $readiness) {}

    private function resolveResort(Request $request): ?Resort
    {
        $user = $request->user();
        if (! $user || $user->tenant_id === null) {
            return null;
        }

        return Resort::withoutGlobalScopes()
            ->with(['tenant', 'subscription', 'rooms.images'])
            ->where('tenant_id', $user->tenant_id)
            ->first();
    }

    private function subscriptionEndAtForOwner(Resort $resort): ?string
    {
        $subscription = $resort->subscription;
        if (! $subscription) {
            return null;
        }

        if (SubscriptionPlan::normalize($subscription->plan) !== SubscriptionPlan::BUSINESS_PRO) {
            if ($subscription->billing_cycle_end !== null || $subscription->next_due_date !== null) {
                $subscription->billing_cycle_end = null;
                $subscription->next_due_date = null;
                $subscription->save();
            }

            return null;
        }

        return $subscription->billing_cycle_end?->toDateString();
    }

    /**
     * GET /resort-owner/landing-page
     * Returns computed auto-generated payload + readiness checklist.
     */
    public function show(Request $request)
    {
        $resort = $this->resolveResort($request);
        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        $owner = $this->readiness->resolveOwner($resort);
        $check = $this->readiness->check($resort);
        $payload = $check['is_ready']
            ? $this->readiness->computePayload($resort, $owner)
            : null;

        return $this->successResponse([
            'subdomain' => $resort->tenant?->subdomain,
            'resort_id' => $resort->id,
            'subscription_status' => $resort->subscription?->status,
            'subscription_plan' => $resort->subscription?->plan,
            'subscription_end_at' => $this->subscriptionEndAtForOwner($resort),
            'subscription_billing_mode' => $resort->subscription?->billing_mode ?? 'manual',
            'subscription_renewal_duration_months' => (int) ($resort->subscription?->renewal_duration_months ?? 1),
            'subscription_recurring_cancelled_at' => $resort->subscription?->recurring_cancelled_at?->toIso8601String(),
            'subscription_next_due_date' => $resort->subscription?->next_due_date?->toDateString(),
            'is_ready' => $check['is_ready'],
            'missing_fields' => $check['missing_fields'],
            'computed' => $payload,
        ], 'Landing page config fetched');
    }

    /**
     * GET /resort-owner/profile-media/{kind}
     * Streams logo or background bytes for the authenticated owner's resort (profile crop editor).
     */
    public function streamProfileMedia(Request $request, string $kind)
    {
        $resort = $this->resolveResort($request);
        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        $stored = match ($kind) {
            'logo' => $resort->logo_url,
            'background', 'cover' => $resort->background_image_url,
            default => null,
        };

        if (! is_string($stored) || trim($stored) === '') {
            return $this->errorResponse('No image uploaded yet.', null, 404);
        }

        $resolved = StoredMedia::resolveDiskAndPathFromStored($stored);
        if ($resolved === null) {
            return $this->errorResponse('Image location could not be resolved.', null, 404);
        }

        return StoredMedia::streamResponseForStoredFile($resolved['disk'], $resolved['path']);
    }

    /**
     * POST /resort-owner/landing-page/upload-bg-image
     * Uploads a background image and saves it directly to the resort record.
     *
     * Server limits: ensure PHP upload_max_filesize and post_max_size exceed the max below (e.g. 32M),
     * and nginx client_max_body_size if applicable, or large uploads will fail before Laravel runs.
     */
    public function uploadBgImage(Request $request)
    {
        $user = $request->user();
        if (! $user || $user->role !== 'resort_owner') {
            abort(403, 'Only resort owners can upload background images.');
        }

        if (! $request->hasFile('image')) {
            return $this->errorResponse(
                MultipartUploadHints::missingFileMessage($request, 'background image'),
                null,
                422
            );
        }

        $request->validate([
            // Large hero backgrounds: up to ~25 MB; common raster formats (GIF/BMP/TIFF for exports & scans).
            'image' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:25600'],
        ], [
            'image.required' => 'Please choose a background image to upload.',
            'image.image' => 'The file must be a valid image (JPEG, PNG, WebP, GIF, BMP, or TIFF).',
            'image.mimes' => 'Use JPEG, PNG, WebP, GIF, BMP, or TIFF — not HEIC/RAW unless converted.',
            'image.max' => 'Background images may be at most 25 MB.',
        ]);

        $uploaded = $request->file('image');
        if (! $uploaded->isValid()) {
            return $this->errorResponse(
                'Upload rejected: '.$uploaded->getErrorMessage().' (code '.$uploaded->getError().'). '
                .'Try `composer run serve` from `backend`, or raise PHP `upload_max_filesize` / `post_max_size`.',
                null,
                422
            );
        }

        $resort = Resort::withoutGlobalScopes()
            ->where('tenant_id', $user->tenant_id)
            ->first();

        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        StoredMedia::deleteIfPresent($resort->background_image_url);

        try {
            $stored = StoredMedia::storeUploadedFile($uploaded, 'resort-backgrounds');
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'Background image could not be saved to storage.',
                ['image' => [$e->getMessage()]],
                500,
            );
        }

        $url = StoredMedia::urlForStoredFile($stored['disk'], $stored['path']);

        $resort->update(['background_image_url' => $url]);

        return $this->successResponse(['url' => $url], 'Background image uploaded');
    }

    /**
     * POST /resort-owner/landing-page/upload-image
     * Generic image upload (kept for backward compat / gallery uses on other flows).
     */
    public function uploadImage(Request $request)
    {
        $user = $request->user();
        if (! $user || $user->role !== 'resort_owner') {
            abort(403, 'Only resort owners can upload landing images.');
        }

        $request->validate([
            'image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:25600'],
            'images' => ['nullable', 'array', 'min:1', 'max:6'],
            'images.*' => ['image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:25600'],
        ]);

        $uploaded = [];

        if ($request->hasFile('image')) {
            $uploaded[] = $request->file('image');
        }
        if ($request->hasFile('images')) {
            foreach ((array) $request->file('images') as $file) {
                if ($file) {
                    $uploaded[] = $file;
                }
            }
        }

        if (count($uploaded) === 0) {
            return $this->errorResponse('Please select at least one image to upload.', null, 422);
        }

        $urls = [];
        foreach ($uploaded as $file) {
            try {
                $stored = StoredMedia::storeUploadedFile($file, 'resort-landing');
                $urls[] = StoredMedia::urlForStoredFile($stored['disk'], $stored['path']);
            } catch (\Throwable $e) {
                return $this->errorResponse(
                    'Image could not be saved to storage.',
                    ['images' => [$e->getMessage()]],
                    500,
                );
            }
        }

        return $this->successResponse([
            'url' => $urls[0] ?? null,
            'urls' => $urls,
        ], count($urls) > 1 ? 'Images uploaded' : 'Image uploaded');
    }

    /**
     * PATCH /resort-owner/landing-page/video — Business Pro only.
     */
    public function updateLandingVideo(Request $request, PlanFeatureResolver $plans)
    {
        $resort = $this->resolveResort($request);
        if (! $resort) {
            return $this->errorResponse('No resort found for this account.', null, 404);
        }

        $plans->assertFeature($resort->subscription, 'video_embed');

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

        $resort->admin_landing_embed_enabled = $enabled;
        if ($request->exists('admin_landing_youtube_url') || $enabled) {
            $resort->admin_landing_youtube_url = $rawUrl;
        }
        $resort->save();

        return $this->successResponse([
            'admin_landing_embed_enabled' => (bool) $resort->admin_landing_embed_enabled,
            'admin_landing_youtube_url' => $resort->admin_landing_youtube_url,
        ], 'Landing video updated');
    }
}
