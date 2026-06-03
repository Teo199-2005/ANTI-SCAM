<?php

declare(strict_types=1);

namespace App\Modules\Admin\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\SiteVisitorService;
use App\Shared\Traits\ApiResponseTrait;

final class AdminVisitorController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly SiteVisitorService $visitorService,
    ) {}

    /**
     * Get overall visitor stats.
     */
    public function stats()
    {
        return $this->successResponse($this->visitorService->getStats(), 'Visitor stats fetched');
    }

    /**
     * Get daily visit counts.
     */
    public function daily()
    {
        $days = min(90, max(7, (int) request()->integer('days', 30)));
        return $this->successResponse($this->visitorService->getDailyVisits($days), 'Daily visits fetched');
    }

    /**
     * Get top visited pages.
     */
    public function topPages()
    {
        $limit = min(50, max(5, (int) request()->integer('limit', 10)));
        return $this->successResponse($this->visitorService->getTopPages($limit), 'Top pages fetched');
    }

    /**
     * Get top visited resorts.
     */
    public function topResorts()
    {
        $limit = min(50, max(5, (int) request()->integer('limit', 10)));
        return $this->successResponse($this->visitorService->getTopResorts($limit), 'Top resorts fetched');
    }

    /**
     * Get recent visitors.
     */
    public function recent()
    {
        $limit = min(100, max(5, (int) request()->integer('limit', 20)));
        return $this->successResponse($this->visitorService->getRecentVisitors($limit), 'Recent visitors fetched');
    }
}
