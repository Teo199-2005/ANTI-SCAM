<?php

namespace App\Modules\Rooms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomImage;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\StoredMedia;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class RoomImageController extends Controller
{
    use ApiResponseTrait;

    public function index(Room $room)
    {
        $this->authorizeRoom($room);

        return $this->successResponse(
            $room->images()->orderBy('sort_order')->get()->map(fn (RoomImage $img) => $this->format($img)),
            'Room images fetched'
        );
    }

    public function store(Request $request, Room $room)
    {
        $this->authorizeRoom($room, 'update');

        $files = $this->normalizeUploadedImages($request);
        if ($files === null) {
            return $this->errorResponse(
                'No photos were received.',
                ['images' => ['The browser did not send any files. Try again, or use a smaller JPEG/PNG/WebP.']],
                422
            );
        }

        $invalidHints = [];
        foreach ($files as $idx => $file) {
            if (! $file instanceof UploadedFile) {
                $invalidHints[] = 'File #'.($idx + 1).': not a valid upload part.';

                continue;
            }
            if (! $file->isValid()) {
                $invalidHints[] = $this->explainUploadFailure($idx, $file);
            }
        }
        if ($invalidHints !== []) {
            return $this->errorResponse(
                'One or more photos could not be uploaded.',
                ['images' => $invalidHints],
                422
            );
        }

        Validator::make(
            ['images' => $files],
            [
                'images' => ['array', 'min:1', 'max:5'],
                // 25600 KB = 25 MB — keep in sync with RESORT_ROOM_PHOTO_MAX_BYTES and PHP upload limits.
                'images.*' => ['image', 'mimes:jpeg,jpg,png,webp,gif,bmp,tif,tiff', 'max:25600'],
            ],
            [
                'images.*.image' => 'Each file must be a readable image.',
                'images.*.mimes' => 'Use JPEG, PNG, WebP, GIF, BMP, or TIFF.',
                'images.*.max' => 'Each image may be up to 25 MB.',
            ],
        )->validate();

        $existing = $room->images()->count();
        if ($existing + count($files) > 5) {
            return $this->errorResponse('A maximum of 5 images per room is allowed. Remove some photos first.', [
                'images' => ['This room already has '.$existing.' image(s); you can add at most '.(5 - $existing).' more.'],
            ], 422);
        }

        $tenantId = TenantContext::tenantId() ?? $request->user()?->tenant_id;
        if (! $tenantId) {
            return $this->errorResponse('Your account is not linked to a resort workspace.', null, 403);
        }

        $created = [];
        foreach ($files as $file) {
            /** @var UploadedFile $file */
            try {
                $stored = StoredMedia::storeUploadedFile($file, "rooms/{$room->id}");
            } catch (\Throwable $e) {
                $hint = app()->environment('local')
                    ? ' On local dev, set AWS_HTTP_VERIFY=false or MEDIA_DISK=public in .env if R2 is unavailable.'
                    : ' Check MEDIA_DISK, R2 credentials, and bucket permissions.';

                return $this->errorResponse(
                    'Photo could not be saved to storage.',
                    ['images' => ['"'.$file->getClientOriginalName().'": '.$e->getMessage().$hint]],
                    500,
                );
            }

            $isPrimary = $room->images()->count() === 0 && count($created) === 0;

            $img = RoomImage::create([
                'room_id' => $room->id,
                'tenant_id' => $tenantId,
                'path' => $stored['path'],
                'disk' => $stored['disk'],
                'original_name' => $file->getClientOriginalName(),
                'sort_order' => $room->images()->count(),
                'is_primary' => $isPrimary,
            ]);
            $created[] = $this->format($img);
        }

        return $this->successResponse($created, 'Images uploaded', 201);
    }

    /**
     * Stream image bytes for dashboard previews (works for public disk and private R2).
     */
    public function file(Room $room, RoomImage $image)
    {
        $this->authorizeRoom($room);
        $this->authorizeImage($room, $image);

        return StoredMedia::httpResponseForStoredFile($image->disk, $image->path);
    }

    public function destroy(Room $room, RoomImage $image)
    {
        $this->authorizeRoom($room, 'update');
        $this->authorizeImage($room, $image);
        if (StoredMedia::isValidStorageKey($image->path)) {
            Storage::disk($image->disk)->delete($image->path);
        }
        $image->delete();

        return $this->successResponse(null, 'Image deleted');
    }

    public function setPrimary(Room $room, RoomImage $image)
    {
        $this->authorizeRoom($room, 'update');
        $this->authorizeImage($room, $image);
        $room->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return $this->successResponse($this->format($image->refresh()), 'Primary image updated');
    }

    private function authorizeImage(Room $room, RoomImage $image): void
    {
        if ($image->room_id !== $room->id) {
            abort(404, 'Image not found for this room.');
        }
    }

    private function authorizeRoom(Room $room, string $ability = 'view'): void
    {
        $this->authorize($ability, $room);
    }

    /**
     * @return list<UploadedFile>|null null = missing input
     */
    private function normalizeUploadedImages(Request $request): ?array
    {
        $raw = $request->file('images');
        if ($raw === null) {
            return null;
        }

        if ($raw instanceof UploadedFile) {
            return [$raw];
        }

        if (is_array($raw)) {
            $out = [];
            foreach ($raw as $f) {
                if ($f instanceof UploadedFile) {
                    $out[] = $f;
                }
            }

            return $out === [] ? null : $out;
        }

        return null;
    }

    private function explainUploadFailure(int $index, UploadedFile $file): string
    {
        $label = $file->getClientOriginalName() !== ''
            ? '"'.$file->getClientOriginalName().'"'
            : 'file #'.($index + 1);

        return match ($file->getError()) {
            UPLOAD_ERR_INI_SIZE => $label.': exceeds PHP upload_max_filesize (server limit).',
            UPLOAD_ERR_FORM_SIZE => $label.': exceeds the maximum size allowed for this request.',
            UPLOAD_ERR_PARTIAL => $label.': only part of the file arrived (network cut-off or proxy). Try again or a smaller file.',
            UPLOAD_ERR_NO_FILE => $label.': empty — nothing was stored on the server.',
            UPLOAD_ERR_NO_TMP_DIR => $label.': server has no temporary folder for uploads.',
            UPLOAD_ERR_CANT_WRITE => $label.': server could not write the file to disk.',
            UPLOAD_ERR_EXTENSION => $label.': blocked by a PHP extension.',
            default => $label.': upload error #'.$file->getError().'.',
        };
    }

    private function format(RoomImage $img): array
    {
        return [
            'id' => $img->id,
            'url' => StoredMedia::urlForStoredFile($img->disk, $img->path),
            'original_name' => $img->original_name,
            'sort_order' => $img->sort_order,
            'is_primary' => (bool) $img->is_primary,
            'broken' => ! StoredMedia::isValidStorageKey($img->path),
        ];
    }
}
