<?php

namespace App\Modules\Public\Http\Controllers;

use App\Services\PhilippineLocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Schema;

class PublicLocationController extends Controller
{
    private const PSGC_SETUP_HINT = 'Run `php artisan migrate` on the API server, then seed or import PSGC data (`php artisan db:seed --class=Database\\Seeders\\PsgcReferenceSeeder` for demos, or `php artisan psgc:import` with official JSON per README).';

    public function __construct(
        private readonly PhilippineLocationService $locations,
    ) {}

    public function provinces(): JsonResponse
    {
        if (! Schema::hasTable('psgc_provinces')) {
            return $this->psgcMissingResponse();
        }

        $data = $this->locations->provinces();

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('Cache-Control', 'public, max-age=86400');
    }

    public function cities(string $provinceCode): JsonResponse
    {
        if (! Schema::hasTable('psgc_provinces') || ! Schema::hasTable('psgc_cities_municipalities')) {
            return $this->psgcMissingResponse();
        }

        $data = $this->locations->citiesForProvince($provinceCode);

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('Cache-Control', 'public, max-age=86400');
    }

    public function barangays(Request $request, string $cityCode): JsonResponse
    {
        if (! Schema::hasTable('psgc_barangays')) {
            return $this->psgcMissingResponse();
        }

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

    private function psgcMissingResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Philippine location data is not installed on this server. '.self::PSGC_SETUP_HINT,
            'data' => null,
        ], 503);
    }
}
