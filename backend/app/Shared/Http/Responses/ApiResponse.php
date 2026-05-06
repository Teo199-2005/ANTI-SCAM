<?php

namespace App\Shared\Http\Responses;

class ApiResponse
{
    public static function make(
        bool $success,
        string $message = '',
        mixed $data = null,
        mixed $errors = null
    ): array {
        return [
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
        ];
    }
}
