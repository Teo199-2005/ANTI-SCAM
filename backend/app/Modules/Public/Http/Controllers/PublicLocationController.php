<?php

namespace App\Modules\Public\Http\Controllers;

use App\Services\PhilippineLocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicLocationController extends Controller
{
    public function __construct(
        private readonly PhilippineLocationService $locations,
    ) {}

    public function provinces(): JsonResponse
    {
        $data = $this->locations->provinces();

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('Cache-Control', 'public, max-age=86400');
    }

    public function cities(string $provinceCode): JsonResponse
    {
        $data = $this->locations->citiesForProvince($provinceCode);

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('Cache-Control', 'public, max-age=86400');
    }

    public function barangays(Request $request, string $cityCode): JsonResponse
    {
        $perPage = min(500, max(10, (int) $request->query('per_page', 300)));

        $paginator = $this->locations->barangaysForCity($cityCode, $perPage);

        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ])->header('Cache-Control', 'public, max-age=86400');
    }
}
