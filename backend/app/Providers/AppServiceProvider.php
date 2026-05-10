<?php

namespace App\Providers;

use App\Models\Reservation;
use App\Models\Resort;
use App\Models\Room;
use App\Models\User;
use App\Modules\Rooms\Services\RoomService;
use App\Modules\Subscriptions\Services\SubscriptionService;
use App\Modules\Users\Repositories\EloquentUserRepository;
use App\Modules\Users\Repositories\UserRepositoryInterface;
use App\Policies\ReservationPolicy;
use App\Policies\ResortPolicy;
use App\Policies\RoomPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        $this->app->bind(RoomService::class, function ($app) {
            return new RoomService($app->make(SubscriptionService::class));
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

        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(180)->by($request->ip());
        });

        RateLimiter::for('booking-actions', function (Request $request) {
            return Limit::perMinute(40)->by($request->user()?->getAuthIdentifier() ?? $request->ip());
        });

        RateLimiter::for('public-forms', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });
    }
}
