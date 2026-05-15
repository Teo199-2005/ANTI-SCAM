<?php

namespace App\Support;

class BulkDeleteResult
{
    public int $deleted = 0;

    /** @var list<array{id: int|string, message: string}> */
    public array $failed = [];

    /**
     * @return array{deleted: int, failed: list<array{id: int|string, message: string}>}
     */
    public function toArray(): array
    {
        return [
            'deleted' => $this->deleted,
            'failed' => $this->failed,
        ];
    }

    public function recordSuccess(): void
    {
        $this->deleted++;
    }

    public function recordFailure(int|string $id, string $message): void
    {
        $this->failed[] = [
            'id' => $id,
            'message' => $message,
        ];
    }
}
