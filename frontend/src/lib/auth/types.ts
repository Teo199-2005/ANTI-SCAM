/**
 * Re-exports from the canonical API types contract.
 * Kept for backward compatibility with existing imports.
 */
export type { AuthUser, UserRole } from "@/lib/api/types";

/** @deprecated Use AuthUser from @/lib/api/types */
export type AuthResponsePayload = {
  user: import("@/lib/api/types").AuthUser;
  token: string;
};
