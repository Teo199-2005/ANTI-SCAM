<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Services\LandingReadinessService;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\MultipartUploadHints;
use App\Support\StoredMedia;
use Illuminate\Http\Request;

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
            'subscription_end_at' => $resort->subscription?->billing_cycle_end?->toDateString(),
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

        $disk = StoredMedia::disk();
        $path = $uploaded->store('resort-backgrounds', $disk);
        $url = StoredMedia::publicUrlForPath($path);

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

        $disk = StoredMedia::disk();
        $urls = [];
        foreach ($uploaded as $file) {
            $path = $file->store('resort-landing', $disk);
            $urls[] = StoredMedia::publicUrlForPath($path);
        }

        return $this->successResponse([
            'url' => $urls[0] ?? null,
            'urls' => $urls,
        ], count($urls) > 1 ? 'Images uploaded' : 'Image uploaded');
    }
}
