<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Support\StoredMedia;

class RoomImage extends Model
{
    protected $fillable = [
        'room_id', 'tenant_id', 'path', 'disk', 'original_name', 'sort_order', 'is_primary',
    ];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean', 'sort_order' => 'integer'];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function getUrlAttribute(): string
    {
        return StoredMedia::urlForStoredFile($this->disk, $this->path);
    }

    /**
     * @return array{id: int, url: string}|null omitted when storage key is invalid (legacy broken rows)
     */
    public function toPublicArray(): ?array
    {
        if (! StoredMedia::isValidStorageKey($this->path)) {
            return null;
        }

        return [
            'id' => $this->id,
            'url' => $this->url,
        ];
    }
}
