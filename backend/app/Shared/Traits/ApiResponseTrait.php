<?php

namespace App\Shared\Traits;

use App\Shared\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

trait ApiResponseTrait
{
    protected function successResponse(mixed $data = null, string $message = '', int $status = 200): JsonResponse
    {
        return response()->json(ApiResponse::make(true, $message, $data, null), $status);
    }

    protected function errorResponse(string $message, mixed $errors = null, int $status = 422): JsonResponse
    {
        return response()->json(ApiResponse::make(false, $message, null, $errors), $status);
    }
}
