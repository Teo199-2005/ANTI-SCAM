/**
 * Shared API type contracts — single source of truth for all frontend↔backend data shapes.
 *
 * Rules:
 *  - All types must mirror their Laravel Resource toArray() output exactly.
 *  - Never use `any`. Use `unknown` with type guards when the shape is truly dynamic.
 *  - Update these when the backend resource changes. Run `tsc --noEmit` to catch regressions.
 */

// ── Envelope ──────────────────────────────────────────────────────────────────
export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
};

export type PaginatedEnvelope<T> = ApiEnvelope<{
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}>;

// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole =
  | "admin"
  | "admin_staff"
  | "resort_owner"
  | "marketing"
  | "client"
  | "user"
  | "guest";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  tenant_id: number | null;
  /** Primary resort for `guest` accounts (from registration). */
  home_resort_id?: number | null;
  /** Present on `/auth/me` when `home_resort_id` is set (Laravel `UserProfilePresenter`). */
  home_resort?: { id: number; name: string; slug: string; logo_url?: string | null } | null;
  google_id: string | null;
  email_verified_at: string | null;
  /** Set when the user accepted the current platform Terms & Conditions */
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  created_at: string;
  /** Resort owner: signup referral trial from registration (also on /auth/me). */
  referral_trial?: {
    active: boolean;
    ends_at: string | null;
    code: string | null;
    marketer_name: string | null;
  } | null;
  /** Marketing: Xendit bank channel code for commission payouts */
  marketer_bank_channel_code?: string | null;
  marketer_bank_label?: string | null;
  bank_payout_configured?: boolean;
  /** Marketing: government ID verification */
  marketer_gov_id_type?: string | null;
  /** True when an ID number is stored (use for UI gating; masked may be absent in edge cases). */
  marketer_gov_id_has_number?: boolean;
  marketer_gov_id_number_masked?: string | null;
  marketer_gov_id_document_url?: string | null;
  marketer_gov_id_placeholder?: string | null;
  marketer_gov_id_format_hint?: string | null;
  marketer_gov_id_label?: string | null;
  marketer_gov_id_complete?: boolean;
  mailing_province_psgc?: string | null;
  mailing_city_municipality_psgc?: string | null;
  mailing_barangay_psgc?: string | null;
  mailing_barangay_name?: string | null;
  mailing_location_label?: string | null;
  /** Resolved mailing line for display (PSGC names or legacy label) */
  marketer_mailing_address?: string | null;
  /** Marketing: masked TIN, e.g. ••••••1234 */
  marketer_tin_masked?: string | null;
  marketer_bank_name?: string | null;
  marketer_bank_branch?: string | null;
  marketer_bank_account_name?: string | null;
  marketer_bank_account_masked?: string | null;
  marketer_bank_details_complete?: boolean;
  /** live | test | unset — from server XENDIT_SECRET_KEY prefix */
  billing_xendit_mode?: "live" | "test" | "unset";
  marketing_payout_automation_enabled?: boolean;
};

// ── Resort ────────────────────────────────────────────────────────────────────
export type Resort = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_listed: boolean;
  is_vip: boolean;
  tenant_id: number | null;
  created_at: string;
  updated_at: string;
};

// ── Room ──────────────────────────────────────────────────────────────────────
export type RoomStatus = "available" | "unavailable" | "maintenance";

export type Room = {
  id: number;
  resort_id: number;
  name: string;
  description: string | null;
  base_price: number;
  capacity: number;
  status: RoomStatus;
  primary_image_url: string | null;
  images: RoomImage[];
  created_at: string;
  updated_at: string;
};

export type RoomImage = {
  id: number;
  url: string;
  is_primary: boolean;
};

// ── Reservation ───────────────────────────────────────────────────────────────
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "completed";

export type Reservation = {
  id: number;
  user_id: number;
  room_id: number;
  resort_id: number;
  check_in_date: string;
  check_out_date: string;
  status: ReservationStatus;
  total_price: number;
  nights: number;
  guest_name: string | null;
  guest_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
  resort?: Resort;
  user?: Pick<AuthUser, "id" | "name" | "email" | "avatar_url">;
};

// ── Discount Code ─────────────────────────────────────────────────────────────
export type DiscountCode = {
  id: number;
  resort_id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

// ── Staff Note ────────────────────────────────────────────────────────────────
export type StaffNote = {
  id: number;
  reservation_id: number;
  user_id: number;
  content: string;
  created_at: string;
  author?: Pick<AuthUser, "id" | "name" | "role">;
};

// ── Notification ──────────────────────────────────────────────────────────────
export type AppNotification = {
  id: number | string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

// ── Admin Stats ───────────────────────────────────────────────────────────────
export type AdminStats = {
  total_resorts: number;
  total_users: number;
  total_reservations: number;
  total_revenue: number;
  pending_reservations: number;
  active_subscriptions: number;
};
