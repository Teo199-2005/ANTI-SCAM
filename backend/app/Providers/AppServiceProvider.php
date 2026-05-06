<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Room;
use App\Models\Reservation;
use App\Models\Resort;
use App\Modules\Users\Repositories\EloquentUserRepository;
use App\Modules\Users\Repositories\UserRepositoryInterface;
use App\Policies\ReservationPolicy;
use App\Policies\ResortPolicy;
use App\Policies\RoomPolicy;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);
        // explicit binding for RoomService to ensure SubscriptionService is injected
        $this->app->bind(\App\Modules\Rooms\Services\RoomService::class, function ($app) {
            return new \App\Modules\Rooms\Services\RoomService($app->make(\App\Modules\Subscriptions\Services\SubscriptionService::class));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Reservation::class, ReservationPolicy::class);
        Gate::policy(Room::class, RoomPolicy::class);
        Gate::policy(Resort::class, ResortPolicy::class);
    }
}
