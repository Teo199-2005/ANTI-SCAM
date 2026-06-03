# Anti-ScamPH Feature Implementation Plan

## Phase 1: Resort Verification Status Display (Admin + Public)

### 1A. Admin can change verification status
- **Backend**: Extend `AdminResortVerificationController` with a `updateStatus` endpoint (PATCH `/admin/resort-verifications/{resort}/status`) allowing admin to set `verification_status` to any valid value: `pending`, `verified`, `rejected`, `needs_documents`, `not_verified`
- **Backend**: Add `not_verified` as a new status in the `verification_status` enum (resorts that have never submitted verification). This is the default for new resorts instead of `pending`.
- **Backend**: Update `AdminResortVerificationService` with an `updateStatus` method that validates the transition and logs the audit trail
- **Backend**: Add route in `api.php` under admin middleware
- **Frontend**: Add a verification status dropdown in `AdminResortVerificationReviewModal.tsx` that allows admin to change between statuses
- **Frontend**: Add status change button/dropdown in `AdminResortsPage` (admin resorts list) for quick status changes

### 1B. Public-facing verification status on resort pages
- **Frontend**: Add verification status banner to `ResortLandingHero.tsx`:
  - If `not_verified`: Show "Not Yet Verified by Anti-ScamPH" warning badge with explanation text
  - If `pending`/`needs_documents`: Show "Verification In Progress" badge
  - If `verified`: Show existing "Verified Resort" badge (already implemented)
  - If `rejected`: Show "Verification Rejected" badge
- **Frontend**: Add verification status indicator to `ResortDetailPage` (`(marketing)/resorts/[id]/page.tsx`)
- **Backend**: Include `verification_status` in public resort API responses (`PublicCatalogController`)

### 1C. Verification status on public resort listing
- **Frontend**: Show verification status badge on resort cards in the public catalog (`(marketing)/resorts/page.tsx`)

**Files affected:**
- `backend/app/Modules/Admin/Http/Controllers/AdminResortVerificationController.php`
- `backend/app/Services/AdminResortVerificationService.php`
- `backend/routes/api.php`
- `backend/database/migrations/` (new migration for `not_verified` default)
- `frontend/src/components/dashboard/AdminResortVerificationReviewModal.tsx`
- `frontend/src/components/resort-page/ResortLandingHero.tsx`
- `frontend/src/app/(marketing)/resorts/[id]/page.tsx`
- `frontend/src/lib/api/adminResortVerification.ts`

---

## Phase 2: Subscription Plan Information Page

### 2A. New public subscription plans page
- **Frontend**: Create `frontend/src/app/(marketing)/plans/page.tsx` with:
  - "Basic Verified" plan section (features, payment setup, best for, important note)
  - "Business Pro Verified" plan section (requirements, features, payment setup, benefits, recommended for)
  - Anti-ScamPH Mission section
  - Safety warning/disclaimer
- **Frontend**: Add navigation link in marketing pages (header/footer)
- **Frontend**: Add "Subscription Plans" or "Pricing" to `ResortPublicNavbar.tsx` or landing page links

### 2B. Update subscription plan config
- **Backend**: Update `config/subscription_plans.php` to match the new plan structure:
  - `basic_verified` (rename from `standard`) with proper feature list and description
  - `business_pro` with proper feature list and description
  - Keep `enterprise` as-is
- **Backend**: Add plan descriptions, feature lists, and pricing details to config
- **Frontend**: Update `SubscriptionPlanLabel` component if plan keys change

**Files affected:**
- `backend/config/subscription_plans.php`
- `frontend/src/app/(marketing)/plans/page.tsx` (new)
- `frontend/src/components/badges/SubscriptionPlanLabel.tsx`
- Marketing navigation components

---

## Phase 3: Visitor Tracking System

### 3A. Backend visitor tracking
- **Backend**: Create migration for `site_visitors` table: `id`, `session_id`, `ip_address` (nullable), `user_agent` (nullable), `page_url`, `referrer_url` (nullable), `visited_at`, `resort_id` (nullable, if viewing a resort page), `is_unique` (boolean)
- **Backend**: Create `SiteVisitor` model
- **Backend**: Create `SiteVisitorService` with methods: `recordVisit()`, `getStats()`, `getDailyVisits()`, `getTopPages()`, `getResortVisits()`
- **Backend**: Create `SiteVisitorController` with public endpoint for recording visits and admin endpoints for stats
- **Backend**: Add routes: POST `/public/visitors/record` (public), GET `/admin/visitors/stats` (admin), GET `/admin/visitors/daily` (admin), GET `/admin/visitors/resort/{resort}` (admin)

### 3B. Frontend visitor recording
- **Frontend**: Create `frontend/src/lib/visitorTracking.ts` - utility to send visit data to backend on page load
- **Frontend**: Add visitor tracking to marketing layout (`(marketing)/layout.tsx`) and resort landing page
- **Frontend**: Use session-based tracking to identify unique visitors

### 3C. Admin visitor dashboard
- **Frontend**: Create `frontend/src/app/dashboard/admin/visitors/page.tsx` with:
  - Total visitors (today, this week, this month, all time)
  - Unique visitors count
  - Daily visit chart (simple bar/line chart)
  - Top visited pages
  - Top visited resorts
  - Recent visitors table
- **Frontend**: Add "Visitors" nav item to admin sidebar in `DashboardSidebar.tsx`

**Files affected:**
- `backend/database/migrations/` (new migration)
- `backend/app/Models/SiteVisitor.php` (new)
- `backend/app/Services/SiteVisitorService.php` (new)
- `backend/app/Modules/Admin/Http/Controllers/SiteVisitorController.php` (new)
- `backend/routes/api.php`
- `frontend/src/lib/visitorTracking.ts` (new)
- `frontend/src/app/(marketing)/layout.tsx`
- `frontend/src/app/resort/[slug]/page.tsx`
- `frontend/src/app/dashboard/admin/visitors/page.tsx` (new)
- `frontend/src/components/dashboard/DashboardSidebar.tsx`

---

## Phase 4: Mobile Room View Fix

### 4A. Fix mobile room cards on resort landing page
- **Frontend**: Fix `ResortRoomsSection.tsx` mobile grid:
  - Currently uses `grid-cols-2` on mobile which makes room cards too cramped
  - Change mobile grid to single column (`grid-cols-1`) or keep 2-col but fix card sizing
  - Fix image aspect ratio on mobile (currently `aspect-[2/1]` is too wide on small screens)
  - Ensure text is readable and buttons are tappable on mobile
  - Fix padding/spacing issues on small viewports
- **Frontend**: Fix `ResortRoomDetailsBookingModal.tsx` mobile layout
- **Frontend**: Fix `ResortLandingHero.tsx` mobile layout if needed
- **Frontend**: Test and fix `(marketing)/resorts/[id]/page.tsx` mobile room display

**Files affected:**
- `frontend/src/components/resort-page/ResortRoomsSection.tsx`
- `frontend/src/components/resort-page/ResortRoomDetailsBookingModal.tsx`
- `frontend/src/app/(marketing)/resorts/[id]/page.tsx`
- `frontend/src/app/(marketing)/resorts/[id]/rooms/[roomId]/page.tsx`

---

## Phase 5: Comment/Review System (Backend + After Booking)

### 5A. Backend review system
- **Backend**: Create migration for `resort_reviews` table: `id`, `resort_id`, `user_id`, `reservation_id`, `rating` (1-5), `comment` (text), `is_visible` (boolean, default true), `created_at`, `updated_at`
- **Backend**: Create `ResortReview` model with relationships to Resort, User, Reservation
- **Backend**: Create `ResortReviewService` with methods: `createReview()`, `getResortReviews()`, `getResortAverageRating()`, `toggleVisibility()`, `getUserReviewForReservation()`
- **Backend**: Create `ResortReviewController` with endpoints:
  - POST `/resorts/{resort}/reviews` - submit review (authenticated, client role, completed booking)
  - GET `/public/resorts/{resort}/reviews` - public list of visible reviews
  - GET `/resorts/{resort}/reviews/summary` - rating summary (public)
  - PATCH `/admin/reviews/{review}/visibility` - admin toggle visibility
- **Backend**: Add routes in `api.php`
- **Backend**: Validation: one review per reservation, reservation must be completed, rating 1-5, comment max 1000 chars

### 5B. Frontend review submission (after booking)
- **Frontend**: Update `frontend/src/app/dashboard/client/reviews/page.tsx`:
  - Replace localStorage-based reviews with API calls
  - Submit reviews to backend via `POST /resorts/{resort}/reviews`
  - Load eligible completed reservations from API
  - Show past reviews from API
- **Frontend**: Add review prompt on booking confirmation page (`(marketing)/resorts/[id]/confirmation/page.tsx`)
- **Frontend**: Create API client functions in `frontend/src/lib/api/reviews.ts`

### 5C. Admin review management
- **Frontend**: Add review visibility toggle in admin dashboard
- **Frontend**: Create `frontend/src/app/dashboard/admin/reviews/page.tsx` for managing reviews

**Files affected:**
- `backend/database/migrations/` (new migration)
- `backend/app/Models/ResortReview.php` (new)
- `backend/app/Services/ResortReviewService.php` (new)
- `backend/app/Modules/Public/Http/Controllers/ResortReviewController.php` (new)
- `backend/app/Modules/Admin/Http/Controllers/AdminReviewController.php` (new)
- `backend/routes/api.php`
- `frontend/src/lib/api/reviews.ts` (new)
- `frontend/src/app/dashboard/client/reviews/page.tsx`
- `frontend/src/app/(marketing)/resorts/[id]/confirmation/page.tsx`
- `frontend/src/app/dashboard/admin/reviews/page.tsx` (new)
- `frontend/src/components/dashboard/DashboardSidebar.tsx`

---

## Phase 6: Star Rating on Resort Landing Page + Public Review Section

### 6A. Star rating display under resort name
- **Frontend**: Add star rating component to `ResortLandingHero.tsx`:
  - Show average star rating with filled/empty stars under the resort name
  - Show total review count (e.g., "4.5 stars (23 reviews)")
  - Only show if resort has reviews
- **Frontend**: Add star rating to resort cards in public catalog
- **Frontend**: Add star rating to `(marketing)/resorts/[id]/page.tsx` (resort detail)

### 6B. Public review section on resort landing page
- **Frontend**: Create `frontend/src/components/resort-page/ResortReviewsSection.tsx`:
  - Fetch reviews from `GET /public/resorts/{resort}/reviews`
  - Rating summary bar (5-star breakdown)
  - Individual review cards with: user name, rating (stars), comment, date
  - "Show more" pagination for many reviews
  - Empty state if no reviews
- **Frontend**: Add `ResortReviewsSection` to `ResortPublicLandingTemplate.tsx` between rooms and about/map sections
- **Backend**: Ensure `PublicCatalogController::landingBySlug` includes review summary data (average rating, count)

### 6C. Rating data in API responses
- **Backend**: Add `average_rating` and `reviews_count` to public resort API responses
- **Backend**: Add `reviews` relationship to `Resort` model

**Files affected:**
- `backend/app/Models/Resort.php`
- `backend/app/Modules/Public/Http/Controllers/PublicCatalogController.php`
- `frontend/src/components/resort-page/ResortLandingHero.tsx`
- `frontend/src/components/resort-page/ResortReviewsSection.tsx` (new)
- `frontend/src/components/resort-page/ResortPublicLandingTemplate.tsx`
- `frontend/src/lib/api/landingPage.ts`
- `frontend/src/app/(marketing)/resorts/page.tsx`
- `frontend/src/app/(marketing)/resorts/[id]/page.tsx`

---

## Implementation Order

1. **Phase 4** (Mobile Fix) - Quick win, no backend changes
2. **Phase 1** (Verification Status) - Core trust feature
3. **Phase 5** (Review Backend) - Foundation for Phase 6
4. **Phase 6** (Star Rating + Reviews on Landing) - Depends on Phase 5
5. **Phase 2** (Subscription Plan Page) - Marketing content
6. **Phase 3** (Visitor Tracking) - Analytics feature

Each phase will be implemented with its own todo list tracking, and verification steps after each implementation.
