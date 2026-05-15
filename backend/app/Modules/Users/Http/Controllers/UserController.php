<?php

namespace App\Modules\Users\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Users\Http\Requests\StoreUserRequest;
use App\Modules\Users\Http\Requests\UpdateUserRequest;
use App\Modules\Users\Http\Resources\UserResource;
use App\Modules\Users\Services\UserService;
use App\Shared\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponseTrait;

    public function __construct(private readonly UserService $service)
    {
        $this->authorizeResource(User::class, 'user');
    }

    public function index(Request $request)
    {
        $location = \App\Support\ResortLocationQuery::fromRequest($request);

        $collection = UserResource::collection(
            $this->service->list(
                (int) $request->integer('perPage', 10),
                $request->string('search')->value(),
                $request->string('sort_by')->value(),
                $request->string('sort_dir')->value(),
                $request->string('role')->value() ?: null,
                $location['province_psgc'],
                $location['city_municipality_psgc'],
            )
        );

        return $this->successResponse($collection, 'Users fetched');
    }

    public function store(StoreUserRequest $request)
    {
        $user = $this->service->create($request->validated());
        return $this->successResponse(new UserResource($user), 'User created', 201);
    }

    public function show(User $user)
    {
        return $this->successResponse(new UserResource($user), 'User details');
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user = $this->service->update($user, $request->validated());
        return $this->successResponse(new UserResource($user), 'User updated');
    }

    public function destroy(User $user)
    {
        $this->service->delete($user);
        return $this->successResponse(null, 'User deleted');
    }
}
