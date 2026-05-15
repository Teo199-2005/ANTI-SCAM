<?php

use App\Http\Controllers\ClientNotificationController;
use App\Http\Controllers\LegalController;
use App\Modules\Admin\Http\Controllers\AdminAnalyticsController;
use App\Modules\Admin\Http\Controllers\AdminFinanceController;
use App\Modules\Admin\Http\Controllers\AdminMailHealthController;
use App\Modules\Admin\Http\Controllers\AdminOnboardController;
use App\Modules\Admin\Http\Controllers\AdminResortLandingEmbedController;
use App\Http\Controllers\BulkDeleteController;
use App\Modules\Admin\Http\Controllers\AdminLocationStatsController;
use App\Modules\Admin\Http\Controllers\AdminStatsController;
use App\Modules\Admin\Http\Controllers\AdminSubscriptionOverviewController;
use App\Modules\Admin\Http\Controllers\MarketingController;
use App\Modules\Admin\Http\Controllers\SuspensionController;
use App\Modules\Admin\Http\Controllers\SystemSettingController;
use App\Modules\Admin\Http\Controllers\VipController;
use App\Modules\Admin\Http\Controllers\XenditLogController;
use App\Modules\Audit\Http\Controllers\AuditLogController;
use App\Modules\Auth\Http\Controllers\AuthController;
use App\Modules\Billing\Http\Controllers\SubscriptionInvoiceController;
use App\Modules\Billing\Http\Controllers\SubscriptionWebhookController;
use App\Modules\Billing\Http\Controllers\XenditInvoiceController;
use App\Modules\Billing\Http\Controllers\XenditPayoutWebhookController;
use App\Modules\Billing\Http\Controllers\XenditExpiredPhWebhookController;
use App\Modules\Billing\Http\Controllers\XenditUnifiedInvoiceWebhookController;
use App\Modules\Billing\Http\Controllers\XenditWebhookController;
use App\Modules\Dashboard\Http\Controllers\DashboardController;
use App\Modules\Dashboard\Http\Controllers\MarketingDashboardController;
use App\Modules\Guests\Http\Controllers\GuestPortalController;
use App\Modules\Public\Http\Controllers\PublicCatalogController;
use App\Modules\Public\Http\Controllers\PublicLocationController;
use App\Modules\Public\Http\Controllers\ReferralValidationController;
use App\Modules\Reservations\Http\Controllers\BookingLockController;
use App\Modules\Reservations\Http\Controllers\ReservationController;
use App\Modules\Reservations\Http\Controllers\StaffNoteController;
use App\Modules\Resorts\Http\Controllers\DiscountCodeController;
use App\Modules\Resorts\Http\Controllers\ResortController;
use App\Modules\Resorts\Http\Controllers\ResortGuestController;
use App\Modules\Resorts\Http\Controllers\ResortLandingPageController;
use App\Modules\Rooms\Http\Controllers\RoomController;
use App\Modules\Rooms\Http\Controllers\RoomImageController;
use App\Modules\Subscriptions\Http\Controllers\SubscriptionController;
use App\Modules\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {

    // ---------- Public legal ----------
    Route::get('/legal/terms', [LegalController::class, 'terms']);
    Route::get('/auth/marketing-gov-id-options', [AuthController::class, 'marketingGovIdOptions']);

    // ---------- Webhooks (no auth, verified by token header) ----------
    Route::get('/webhooks/xendit/health', function () {
        return response()->json([
            'success' => true,
            'message' => 'Xendit webhook endpoint reachable',
            'data' => ['ok' => true, 'host' => 'anti-scamph.com'],
        ]);
    });

    Route::middleware('throttle:webhooks')->group(function (): void {
        Route::post('/webhooks/xendit/invoices', [XenditUnifiedInvoiceWebhookController::class, 'handle']);
        Route::post('/webhooks/xendit/invoice', [XenditWebhookController::class, 'invoice']);
        Route::post('/webhooks/xendit/subscription-invoice', [SubscriptionWebhookController::class, 'invoice']);
        Route::post('/webhooks/xendit/expired-ph', [XenditExpiredPhWebhookController::class, 'handle']);
        Route::post('/webhooks/xendit/payout', [XenditPayoutWebhookController::class, 'payout']);
    });

    // ---------- Auth (rate limited) ----------
    // 10 attempts per minute for login (brute-force protection).
    Route::middleware('throttle:10,1')->group(function (): void {
        Route::post('/auth/login', [AuthController::class, 'login']);
    });
    // 5 new accounts per hour per IP (registration abuse protection).
    Route::middleware('throttle:5,60')->group(function (): void {
        Route::post('/auth/register', [AuthController::class, 'register']);
    });
    Route::middleware('throttle:password-reset-request')->group(function (): void {
        Route::post('/auth/forgot-password', [AuthController::class, 'forgotPasswordRequest']);
    });
    Route::middleware('throttle:password-reset-verify')->group(function (): void {
        Route::post('/auth/forgot-password/reset', [AuthController::class, 'forgotPasswordReset']);
    });

    // ---------- Public catalog ----------
    Route::get('/public/resorts', [PublicCatalogController::class, 'resorts']);
    Route::get('/public/locations/provinces', [PublicLocationController::class, 'provinces']);
    Route::get('/public/locations/provinces/{provinceCode}/cities', [PublicLocationController::class, 'cities']);
    Route::get('/public/locations/cities/{cityCode}/barangays', [PublicLocationController::class, 'barangays']);
    Route::get('/public/resorts/landing/{slug}', [PublicCatalogController::class, 'landingBySlug']);
    Route::get('/public/resorts/slug/{slug}', [PublicCatalogController::class, 'resortBySlug']);
    Route::get('/public/resorts/{resort}', [PublicCatalogController::class, 'resort']);
    Route::get('/public/rooms/{room}', [PublicCatalogController::class, 'room']);
    Route::get('/public/rooms/{room}/availability', [PublicCatalogController::class, 'checkAvailability']);

    // Discount code validation (public, called from checkout)
    Route::middleware('throttle:public-forms')->group(function (): void {
        Route::post('/public/discount-codes/validate', [DiscountCodeController::class, 'validateCode']);
    });

    Route::middleware('throttle:30,1')->group(function (): void {
        Route::post('/public/referrals/validate', [ReferralValidationController::class, 'validateCode']);
    });

    // ---------- Authenticated ----------
    Route::middleware('auth:sanctum')->group(function (): void {

        // Auth
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/password', [AuthController::class, 'changePassword']);
        Route::post('/auth/avatar', [AuthController::class, 'updateAvatar']);
        Route::post('/auth/marketing-gov-id-document', [AuthController::class, 'uploadMarketingGovIdDocument']);
        Route::middleware('throttle:8,1')->group(function (): void {
            Route::post('/auth/email-otp/send', [AuthController::class, 'sendEmailVerificationOtp']);
            Route::post('/auth/email-otp/verify', [AuthController::class, 'verifyEmailVerificationOtp']);
        });

        Route::get('/notifications', [ClientNotificationController::class, 'index']);
        Route::post('/notifications/mark-all-read', [ClientNotificationController::class, 'markAllRead']);

        // Dashboard stats
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/resort-stats', [DashboardController::class, 'resortStats']);
        Route::get('/dashboard/resort-booking-calendar', [DashboardController::class, 'resortBookingCalendar']);
        Route::get('/dashboard/resort-revenue-analytics', [DashboardController::class, 'resortRevenueAnalytics']);

        // Marketing dashboard (role: marketing)
        Route::middleware('role:marketing,admin')->group(function (): void {
            Route::get('/dashboard/marketing/stats', [MarketingDashboardController::class, 'stats']);
            Route::get('/dashboard/marketing/resorts', [MarketingDashboardController::class, 'assignedResorts']);
            Route::get('/dashboard/marketing/commissions', [MarketingDashboardController::class, 'commissions']);
            Route::get('/dashboard/marketing/releases', [MarketingDashboardController::class, 'releaseHistory']);
        });

        Route::middleware('role:marketing')->group(function (): void {
            Route::get('/dashboard/marketing/analytics', [MarketingDashboardController::class, 'analytics']);
            Route::get('/dashboard/marketing/clients', [MarketingDashboardController::class, 'clients']);
        });

        // Admin-only routes
        Route::middleware('role:admin')->group(function (): void {
            Route::post('/users/bulk-delete', [BulkDeleteController::class, 'users']);
            Route::get('/admin/stats', [AdminStatsController::class, 'stats']);
            Route::get('/admin/location-stats', [AdminLocationStatsController::class, 'index']);
            Route::get('/admin/analytics', [AdminAnalyticsController::class, 'index']);
            Route::get('/admin/subscriptions/overview', [AdminSubscriptionOverviewController::class, 'index']);
            Route::get('/admin/finance/overview', [AdminFinanceController::class, 'overview']);
            Route::get('/admin/finance/payment-ledger', [AdminFinanceController::class, 'paymentLedger']);
            Route::get('/admin/finance/commissions', [AdminFinanceController::class, 'commissions']);
            Route::get('/admin/finance/withholding-batches', [AdminFinanceController::class, 'withholdingBatches']);
            Route::get('/admin/finance/commission-releases', [AdminFinanceController::class, 'commissionReleases']);
            Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/admin/resorts/assignable-owners', [AdminOnboardController::class, 'assignableOwners']);
            Route::post('/admin/resorts/onboard', [AdminOnboardController::class, 'store']);
            Route::post('/admin/resorts/onboard/upload-logo', [AdminOnboardController::class, 'uploadLogo']);
            Route::post('/admin/resorts/onboard/upload-background', [AdminOnboardController::class, 'uploadBackground']);
            Route::post('/subscriptions/enforce-grace-period', [SubscriptionController::class, 'enforceGracePeriod']);

            // VIP badge management
            Route::post('/admin/resorts/{resort}/vip', [VipController::class, 'setVip']);

            Route::patch('/admin/resorts/{resort}/landing-embed', [AdminResortLandingEmbedController::class, 'update']);

            // Suspension / grace lists
            Route::get('/admin/suspensions', [SuspensionController::class, 'index']);

            // Xendit payment logs
            Route::get('/admin/xendit-logs', [XenditLogController::class, 'index']);
            Route::post('/admin/resorts/{resort}/subscriptions/trigger-invoice', [SubscriptionInvoiceController::class, 'create']);
            Route::post('/admin/mail/test', [AdminMailHealthController::class, 'send']);

            // System settings
            Route::get('/admin/settings', [SystemSettingController::class, 'index']);
            Route::put('/admin/settings', [SystemSettingController::class, 'update']);

            // Marketing management
            Route::get('/admin/marketers', [MarketingController::class, 'marketers']);
            Route::get('/admin/marketers/monitoring', [MarketingController::class, 'marketersMonitoring']);
            Route::post('/admin/marketers/assign', [MarketingController::class, 'assign']);
            Route::post('/admin/marketers/unassign', [MarketingController::class, 'unassign']);
            Route::post('/admin/commissions/{commission}/release', [MarketingController::class, 'release']);
        });

        // Staff notes (admin + admin_staff)
        Route::get('/staff/notes', [StaffNoteController::class, 'myNotes']);
        Route::get('/reservations/{reservation}/notes', [StaffNoteController::class, 'index']);
        Route::post('/reservations/{reservation}/notes', [StaffNoteController::class, 'store']);
        Route::delete('/reservations/{reservation}/notes/{note}', [StaffNoteController::class, 'destroy']);

        Route::middleware('role:resort_owner,admin_staff,admin')->group(function (): void {
            Route::post('/resort/guests/bulk-delete', [BulkDeleteController::class, 'resortGuests']);
            Route::get('/resort/guests/{guestKey}/reservations', [ResortGuestController::class, 'reservationsForGuest']);
            Route::get('/resort/guests/{guestKey}', [ResortGuestController::class, 'show']);
            Route::patch('/resort/guests/{guestKey}', [ResortGuestController::class, 'update']);
            Route::delete('/resort/guests/{guestKey}', [ResortGuestController::class, 'destroy']);
            Route::post('/resort/guests', [ResortGuestController::class, 'store']);
            Route::get('/resort/guests', [ResortGuestController::class, 'index']);
        });

        Route::middleware('role:guest')->prefix('guest')->group(function (): void {
            Route::post('/favorites/bulk-delete', [BulkDeleteController::class, 'guestFavorites']);
            Route::get('/resort', [GuestPortalController::class, 'resort']);
            Route::get('/rooms', [GuestPortalController::class, 'rooms']);
            Route::get('/reservations', [GuestPortalController::class, 'reservations']);
            Route::get('/favorites', [GuestPortalController::class, 'favoritesIndex']);
            Route::post('/favorites', [GuestPortalController::class, 'favoritesStore']);
            Route::delete('/favorites/{roomId}', [GuestPortalController::class, 'favoritesDestroy'])
                ->whereNumber('roomId');
        });
        Route::middleware('throttle:booking-actions')->group(function (): void {
            Route::post('/booking-locks', [BookingLockController::class, 'store']);
            Route::post('/reservations', [ReservationController::class, 'store']);
            Route::post('/reservations/{reservation}/invoice', [XenditInvoiceController::class, 'create']);
        });

        // Reservations
        Route::middleware('role:resort_owner')->group(function (): void {
            Route::post('/reservations/manual', [ReservationController::class, 'storeManual']);
            Route::patch('/reservations/{reservation}/manual', [ReservationController::class, 'updateManual']);
            Route::post('/reservations/{reservation}/cancel-by-resort', [ReservationController::class, 'cancelByResort']);
        });
        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::get('/reservations/{reservation}', [ReservationController::class, 'show']);
        Route::post('/reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
        Route::post('/reservations/{reservation}/complete', [ReservationController::class, 'markCompletedByResort']);
        Route::post('/reservations/{reservation}/no-show', [ReservationController::class, 'markNoShowByResort']);
        Route::post('/reservations/{reservation}/admin-override', [ReservationController::class, 'adminOverride']);

        // Subscriptions
        Route::middleware('role:resort_owner,admin')->group(function (): void {
            Route::post('/resorts/{resort}/subscriptions/refresh', [SubscriptionController::class, 'refresh']);
            Route::post('/resorts/{resort}/subscriptions/pay-invoice', [SubscriptionInvoiceController::class, 'create']);
            Route::post('/resorts/{resort}/subscriptions/sync-invoice', [SubscriptionInvoiceController::class, 'syncPendingFromGateway']);
            Route::get('/resorts/{resort}/subscriptions/invoices', [SubscriptionInvoiceController::class, 'index']);
        });

        // Resort-owner self-onboarding
        Route::middleware('role:resort_owner')->group(function (): void {
            Route::post('/resort-owner/onboard', [AdminOnboardController::class, 'ownerStore']);
            Route::post('/resort-owner/onboard/upload-logo', [AdminOnboardController::class, 'ownerUploadLogo']);
            Route::get('/resort-owner/landing-page', [ResortLandingPageController::class, 'show']);
            Route::post('/resort-owner/landing-page/upload-bg-image', [ResortLandingPageController::class, 'uploadBgImage']);
            Route::post('/resort-owner/landing-page/upload-image', [ResortLandingPageController::class, 'uploadImage']);
            Route::post('/resort-owner/referrals/validate', [ReferralValidationController::class, 'validateForOwner']);
            Route::post('/resort-owner/subscriptions/pay-invoice', [SubscriptionInvoiceController::class, 'createForOwner']);
        });

        // Resources
        Route::apiResource('resorts', ResortController::class);
        Route::apiResource('users', UserController::class);
        Route::post('/rooms/bulk-delete', [BulkDeleteController::class, 'rooms']);
        Route::apiResource('rooms', RoomController::class);

        // Room availability
        Route::get('/rooms/{room}/availability', [RoomController::class, 'availability']);
        Route::post('/rooms/{room}/availability', [RoomController::class, 'storeAvailability']);
        Route::post('/rooms/{room}/availability/bulk-delete', [BulkDeleteController::class, 'availability']);
        Route::delete('/rooms/{room}/availability/{availability}', [RoomController::class, 'destroyAvailability']);

        // Room images
        Route::get('/rooms/{room}/images', [RoomImageController::class, 'index']);
        Route::post('/rooms/{room}/images', [RoomImageController::class, 'store']);
        Route::delete('/rooms/{room}/images/{image}', [RoomImageController::class, 'destroy']);
        Route::post('/rooms/{room}/images/{image}/primary', [RoomImageController::class, 'setPrimary']);

        // Discount codes
        Route::get('/resorts/{resort}/discount-codes', [DiscountCodeController::class, 'index']);
        Route::post('/resorts/{resort}/discount-codes', [DiscountCodeController::class, 'store']);
        Route::patch('/resorts/{resort}/discount-codes/{code}', [DiscountCodeController::class, 'update']);
        Route::post('/resorts/{resort}/discount-codes/bulk-delete', [BulkDeleteController::class, 'discountCodes']);
        Route::delete('/resorts/{resort}/discount-codes/{code}', [DiscountCodeController::class, 'destroy']);
    });
});
