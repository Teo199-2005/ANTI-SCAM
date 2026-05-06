<?php

use App\Modules\Admin\Http\Controllers\AdminOnboardController;
use App\Modules\Admin\Http\Controllers\AdminStatsController;
use App\Modules\Admin\Http\Controllers\MarketingController;
use App\Modules\Admin\Http\Controllers\SuspensionController;
use App\Modules\Admin\Http\Controllers\SystemSettingController;
use App\Modules\Admin\Http\Controllers\VipController;
use App\Modules\Admin\Http\Controllers\XenditLogController;
use App\Modules\Audit\Http\Controllers\AuditLogController;
use App\Modules\Auth\Http\Controllers\AuthController;
use App\Modules\Billing\Http\Controllers\XenditInvoiceController;
use App\Modules\Billing\Http\Controllers\XenditWebhookController;
use App\Modules\Dashboard\Http\Controllers\DashboardController;
use App\Modules\Dashboard\Http\Controllers\MarketingDashboardController;
use App\Modules\Public\Http\Controllers\PublicCatalogController;
use App\Modules\Reservations\Http\Controllers\BookingLockController;
use App\Modules\Reservations\Http\Controllers\ReservationController;
use App\Modules\Reservations\Http\Controllers\StaffNoteController;
use App\Modules\Resorts\Http\Controllers\DiscountCodeController;
use App\Modules\Resorts\Http\Controllers\ResortController;
use App\Modules\Resorts\Http\Controllers\ResortGuestController;
use App\Modules\Rooms\Http\Controllers\RoomController;
use App\Modules\Rooms\Http\Controllers\RoomImageController;
use App\Modules\Subscriptions\Http\Controllers\SubscriptionController;
use App\Http\Controllers\ClientNotificationController;
use App\Modules\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {

    // ---------- Webhooks (no auth, verified by token header) ----------
    Route::post('/webhooks/xendit/invoice', [XenditWebhookController::class, 'invoice']);

    // ---------- Auth (rate limited) ----------
    // 10 attempts per minute for login (brute-force protection).
    Route::middleware('throttle:10,1')->group(function (): void {
        Route::post('/auth/login',    [AuthController::class, 'login']);
    });
    // 5 new accounts per hour per IP (registration abuse protection).
    Route::middleware('throttle:5,60')->group(function (): void {
        Route::post('/auth/register', [AuthController::class, 'register']);
    });

    // ---------- Public catalog ----------
    Route::get('/public/resorts',                          [PublicCatalogController::class, 'resorts']);
    Route::get('/public/resorts/{resort}',                 [PublicCatalogController::class, 'resort']);
    Route::get('/public/resorts/slug/{slug}',              [PublicCatalogController::class, 'resortBySlug']);
    Route::get('/public/rooms/{room}',                     [PublicCatalogController::class, 'room']);
    Route::get('/public/rooms/{room}/availability',        [PublicCatalogController::class, 'checkAvailability']);

    // Discount code validation (public, called from checkout)
    Route::post('/public/discount-codes/validate',         [DiscountCodeController::class, 'validate']);

    // ---------- Authenticated ----------
    Route::middleware('auth:sanctum')->group(function (): void {

        // Auth
        Route::get('/auth/me',                [AuthController::class, 'me']);
        Route::post('/auth/logout',           [AuthController::class, 'logout']);
        Route::patch('/auth/profile',         [AuthController::class, 'updateProfile']);
        Route::post('/auth/password',         [AuthController::class, 'changePassword']);
        Route::post('/auth/avatar',           [AuthController::class, 'updateAvatar']);

        Route::get('/notifications', [ClientNotificationController::class, 'index']);
        Route::post('/notifications/mark-all-read', [ClientNotificationController::class, 'markAllRead']);

        // Dashboard stats
        Route::get('/dashboard/stats',        [DashboardController::class, 'stats']);
        Route::get('/dashboard/resort-stats', [DashboardController::class, 'resortStats']);

        // Marketing dashboard (role: marketing)
        Route::middleware('role:marketing,admin')->group(function (): void {
            Route::get('/dashboard/marketing/stats',          [MarketingDashboardController::class, 'stats']);
            Route::get('/dashboard/marketing/resorts',        [MarketingDashboardController::class, 'assignedResorts']);
            Route::get('/dashboard/marketing/commissions',    [MarketingDashboardController::class, 'commissions']);
            Route::get('/dashboard/marketing/releases',       [MarketingDashboardController::class, 'releaseHistory']);
        });

        // Admin-only routes
        Route::middleware('role:admin')->group(function (): void {
            Route::get('/admin/stats',                           [AdminStatsController::class, 'stats']);
            Route::get('/admin/audit-logs',                      [AuditLogController::class, 'index']);
            Route::post('/admin/resorts/onboard',                [AdminOnboardController::class, 'store']);
            Route::post('/subscriptions/enforce-grace-period',   [SubscriptionController::class, 'enforceGracePeriod']);

            // VIP badge management
            Route::post('/admin/resorts/{resort}/vip',           [VipController::class, 'setVip']);

            // Suspension / grace lists
            Route::get('/admin/suspensions',                     [SuspensionController::class, 'index']);

            // Xendit payment logs
            Route::get('/admin/xendit-logs',                     [XenditLogController::class, 'index']);

            // System settings
            Route::get('/admin/settings',                        [SystemSettingController::class, 'index']);
            Route::put('/admin/settings',                        [SystemSettingController::class, 'update']);

            // Marketing management
            Route::get('/admin/marketers',                       [MarketingController::class, 'marketers']);
            Route::post('/admin/marketers/assign',               [MarketingController::class, 'assign']);
            Route::post('/admin/marketers/unassign',             [MarketingController::class, 'unassign']);
            Route::post('/admin/commissions/{commission}/release', [MarketingController::class, 'release']);
        });

        // Staff notes (admin + admin_staff)
        Route::get('/staff/notes',                              [StaffNoteController::class, 'myNotes']);
        Route::get('/reservations/{reservation}/notes',         [StaffNoteController::class, 'index']);
        Route::post('/reservations/{reservation}/notes',        [StaffNoteController::class, 'store']);
        Route::delete('/reservations/{reservation}/notes/{note}', [StaffNoteController::class, 'destroy']);

        // Resort guests
        Route::get('/resort/guests',                            [ResortGuestController::class, 'index']);

        // Booking
        Route::post('/booking-locks', [BookingLockController::class, 'store']);

        // Reservations
        Route::get('/reservations',                                  [ReservationController::class, 'index']);
        Route::get('/reservations/{reservation}',                    [ReservationController::class, 'show']);
        Route::post('/reservations',                                 [ReservationController::class, 'store']);
        Route::post('/reservations/{reservation}/cancel',            [ReservationController::class, 'cancel']);
        Route::post('/reservations/{reservation}/admin-override',    [ReservationController::class, 'adminOverride']);
        Route::post('/reservations/{reservation}/invoice',           [XenditInvoiceController::class, 'create']);

        // Subscriptions
        Route::post('/resorts/{resort}/subscriptions/refresh', [SubscriptionController::class, 'refresh']);

        // Resources
        Route::apiResource('resorts', ResortController::class);
        Route::apiResource('users',   UserController::class);
        Route::apiResource('rooms',   RoomController::class);

        // Room availability
        Route::get('/rooms/{room}/availability',                   [RoomController::class, 'availability']);
        Route::post('/rooms/{room}/availability',                  [RoomController::class, 'storeAvailability']);
        Route::delete('/rooms/{room}/availability/{availability}', [RoomController::class, 'destroyAvailability']);

        // Room images
        Route::get('/rooms/{room}/images',                         [RoomImageController::class, 'index']);
        Route::post('/rooms/{room}/images',                        [RoomImageController::class, 'store']);
        Route::delete('/rooms/{room}/images/{image}',              [RoomImageController::class, 'destroy']);
        Route::post('/rooms/{room}/images/{image}/primary',        [RoomImageController::class, 'setPrimary']);

        // Discount codes
        Route::get('/resorts/{resort}/discount-codes',             [DiscountCodeController::class, 'index']);
        Route::post('/resorts/{resort}/discount-codes',            [DiscountCodeController::class, 'store']);
        Route::patch('/resorts/{resort}/discount-codes/{code}',    [DiscountCodeController::class, 'update']);
        Route::delete('/resorts/{resort}/discount-codes/{code}',   [DiscountCodeController::class, 'destroy']);
    });
});
