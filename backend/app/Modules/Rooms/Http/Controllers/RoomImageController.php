<?php

namespace App\Modules\Rooms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomImage;
use App\Shared\Traits\ApiResponseTrait;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
        $this->authorizeRoom($room);

        $request->validate([
            // enforce max 5 images per room
            'images'   => ['required', 'array', 'min:1', 'max:5'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $tenantId = TenantContext::tenantId() ?? $request->user()?->tenant_id;

        $created = [];
        foreach ($request->file('images') as $file) {
            $path      = $file->store("rooms/{$room->id}", 'public');
            $isPrimary = $room->images()->count() === 0 && count($created) === 0;

            $img = RoomImage::create([
                'room_id'       => $room->id,
                'tenant_id'     => $tenantId,
                'path'          => $path,
                'disk'          => 'public',
                'original_name' => $file->getClientOriginalName(),
                'sort_order'    => $room->images()->count(),
                'is_primary'    => $isPrimary,
            ]);
            $created[] = $this->format($img);
        }

        return $this->successResponse($created, 'Images uploaded', 201);
    }

    public function destroy(Room $room, RoomImage $image)
    {
        $this->authorizeRoom($room);
        $this->authorizeImage($room, $image);
        Storage::disk($image->disk)->delete($image->path);
        $image->delete();
        return $this->successResponse(null, 'Image deleted');
    }

    public function setPrimary(Room $room, RoomImage $image)
    {
        $this->authorizeRoom($room);
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

    private function authorizeRoom(Room $room): void
    {
        $user     = auth()->user();
        $tenantId = TenantContext::tenantId() ?? $user?->tenant_id;

        if ($tenantId && $room->tenant_id !== $tenantId) {
            abort(403, 'Access denied.');
        }
    }

    private function format(RoomImage $img): array
    {
        return [
            'id'            => $img->id,
            'url'           => Storage::disk($img->disk)->url($img->path),
            'original_name' => $img->original_name,
            'sort_order'    => $img->sort_order,
            'is_primary'    => (bool) $img->is_primary,
        ];
    }
}
