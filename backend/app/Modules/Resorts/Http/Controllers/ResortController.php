<?php

namespace App\Modules\Resorts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Resort;
use App\Modules\Resorts\Http\Requests\StoreResortRequest;
use App\Modules\Resorts\Http\Requests\UpdateResortRequest;
use App\Modules\Resorts\Http\Resources\ResortResource;
use App\Modules\Resorts\Services\ResortService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ResortController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly ResortService $service)
    {
        $this->authorizeResource(Resort::class, 'resort');
    }

    public function index(Request $request)
    {
        $location = \App\Support\ResortLocationQuery::fromRequest($request);

        $resorts = ResortResource::collection(
            $this->service->list(
                $request->user(),
                (int) $request->integer('perPage', 10),
                $request->string('search')->value(),
                $request->string('sort_by')->value(),
                $request->string('sort_dir')->value(),
                $location['province_psgc'],
                $location['city_municipality_psgc'],
            )
        );

        return $this->successResponse($resorts, 'Resorts fetched');
    }

    public function store(StoreResortRequest $request)
    {
        $resort = $this->service->create($request->validated(), $request->user())
            ->load('subscription')
            ->loadCount('rooms');

        return $this->successResponse(new ResortResource($resort), 'Resort created', 201);
    }

    public function show(Resort $resort)
    {
        $resort->load('tenant:id,subdomain')->load('subscription')->loadCount('rooms');
        return $this->successResponse(new ResortResource($resort), 'Resort details');
    }

    public function update(UpdateResortRequest $request, Resort $resort)
    {
        $updated = $this->service->update($resort, $request->validated());
        return $this->successResponse(new ResortResource($updated), 'Resort updated');
    }

    public function destroy(Resort $resort)
    {
        $this->service->delete($resort);
        return $this->successResponse(null, 'Resort deleted');
    }
}
