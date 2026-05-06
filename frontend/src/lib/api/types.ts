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
  | "user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  tenant_id: number | null;
  google_id: string | null;
  email_verified_at: string | null;
  created_at: string;
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
