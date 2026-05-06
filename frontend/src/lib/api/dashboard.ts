import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type RecentReservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: string;
};

export type ResortDashboardStats = {
  activeRooms: number;
  lockedBookings: number;
  confirmedToday: number;
  occupancyRate?: number;
  totalReservationFees?: number;
  totalGrossBookings?: number;
  revenueThisMonth?: number;
  totalConfirmed?: number;
  totalPending?: number;
  recentReservations: RecentReservation[];
};

export async function getResortStats() {
  const { data } = await apiClient.get<ApiEnvelope<ResortDashboardStats>>("/dashboard/resort-stats");
  return data.data;
}
