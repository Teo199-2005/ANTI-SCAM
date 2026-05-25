<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Services\AdminResortVerificationService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class AdminResortVerificationController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly AdminResortVerificationService $verification,
    ) {}

    public function stats()
    {
        return $this->successResponse(
            $this->verification->queueStats(),
            'Verification queue stats fetched',
        );
    }

    public function index(Request $request)
    {
        $paginator = $this->verification->list($request);

        $items = collect($paginator->items())->map(function (Resort $resort): array {
            return [
                'id' => $resort->id,
                'name' => $resort->name,
                'subdomain' => $resort->tenant?->subdomain,
                'verification_status' => $resort->verification_status,
                'verification_method' => $resort->verification_method,
                'verification_submitted_at' => $resort->verification_submitted_at?->toIso8601String(),
                'verified_at' => $resort->verified_at?->toIso8601String(),
                'is_publicly_listed' => $resort->is_publicly_listed,
                'rooms_count' => $resort->rooms_count,
            ];
        });

        return $this->successResponse([
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ], 'Verification queue fetched');
    }

    public function show(Resort $resort)
    {
        return $this->successResponse(
            $this->verification->detail($resort),
            'Verification detail fetched',
        );
    }

    public function approve(Request $request, Resort $resort)
    {
        $updated = $this->verification->approve($request->user(), $resort, $request->all());

        return $this->successResponse([
            'id' => $updated->id,
            'verification_status' => $updated->verification_status,
            'verified_at' => $updated->verified_at?->toIso8601String(),
            'is_publicly_listed' => $updated->is_publicly_listed,
        ], 'Resort verified');
    }

    public function reject(Request $request, Resort $resort)
    {
        $updated = $this->verification->reject($request->user(), $resort, $request->all());

        return $this->successResponse([
            'id' => $updated->id,
            'verification_status' => $updated->verification_status,
            'verification_rejection_reason' => $updated->verification_rejection_reason,
            'is_publicly_listed' => $updated->is_publicly_listed,
        ], 'Verification rejected');
    }

    public function requestMoreDocuments(Request $request, Resort $resort)
    {
        $updated = $this->verification->requestMoreDocuments($request->user(), $resort, $request->all());

        return $this->successResponse([
            'id' => $updated->id,
            'verification_status' => $updated->verification_status,
            'verification_rejection_reason' => $updated->verification_rejection_reason,
            'is_publicly_listed' => $updated->is_publicly_listed,
        ], 'More documents requested');
    }

    public function updateReview(Request $request, Resort $resort)
    {
        $updated = $this->verification->updateReview($resort, $request->all());

        return $this->successResponse(
            $this->verification->detail($updated),
            'Verification review updated',
        );
    }

    public function downloadDocuments(Resort $resort)
    {
        return $this->verification->downloadDocumentsZip($resort);
    }
}
