"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, CalendarDays, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Reservation = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
};

type ApiEnvelope<T> = { success: boolean; data: { data: T[] } };

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] ?? "Staff";

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<Reservation>>("/reservations", { params: { perPage: 15 } });
        setReservations(data.data?.data ?? []);
      } catch (err) {
        setReservations([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">

      {/* Hero banner */}
      <div className="dash-hero-banner-staff flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Staff Portal</p>
          <h1 className="mt-1 font-dash text-2xl font-bold">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-white/65">
            View reservations, add support notes, and escalate issues to admin.
          </p>
        </div>
        <div className="dash-hero-glass-panel px-3 py-2 text-xs font-semibold text-white/70">
          Read-only portal · Limited permissions
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2">
        {[
          { label: "All Reservations", desc: "View & add notes to any reservation", icon: CalendarDays, href: "/dashboard/staff/reservations", color: "bg-softGray text-slateBlue" },
          { label: "Notes & Escalations", desc: "Support notes you've added", icon: MessageSquare, href: "/dashboard/staff/notes", color: "bg-violet-100 text-violet-600" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="dash-card-hover flex items-start gap-4 rounded-2xl bg-softCard p-5 shadow-card"
          >
            <div className={`inline-flex rounded-xl p-3 ${item.color}`}>
              <item.icon size={18} />
            </div>
            <div>
              <p className="font-semibold text-navy">{item.label}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Reservations */}
      <DashCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-softBorder px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-lg bg-softGray p-2"><CalendarDays size={16} className="text-slateBlue" /></div>
            <div>
              <h2 className="font-dash text-base font-semibold text-navy">Recent Reservations</h2>
              <p className="text-xs text-zinc-400">View-only — add notes via reservation detail</p>
            </div>
          </div>
        </div>
        {loading ? (
          <>
            <div className="md:hidden space-y-2 p-4">
              <DashMobileTableSkeleton rows={3} />
            </div>
            <div className="hidden md:block space-y-2 p-4">{[1,2,3].map(i=><div key={i} className="h-14 animate-pulse rounded-xl bg-softGray"/>)}</div>
          </>
        ) : reservations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No reservations found.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {reservations.map((r) => (
                <DashMobileTableCard
                  key={r.id}
                  title={<span className="font-mono text-sm">{r.reference_no}</span>}
                  fields={[
                    { label: "Check-in", value: r.check_in_date },
                    { label: "Check-out", value: r.check_out_date },
                    { label: "Amount", value: `₱${Number(r.total_amount).toLocaleString()}` },
                    {
                      label: "Status",
                      value: <span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_", " ")}</span>,
                    },
                  ]}
                  actions={
                    <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm w-full justify-center">
                      View / Note
                    </Link>
                  }
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <DashTableActionsHead>Action</DashTableActionsHead>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs font-semibold text-navy">{r.reference_no}</td>
                      <td className="text-zinc-600">{r.check_in_date}</td>
                      <td className="text-zinc-600">{r.check_out_date}</td>
                      <td className="font-medium text-emerald-700">₱{Number(r.total_amount).toLocaleString()}</td>
                      <td><span className={statusBadge[r.status] ?? "dash-badge-slate"}>{r.status.replaceAll("_"," ")}</span></td>
                      <DashTableActionsCell>
                        <DashTableActionsInner>
                          <Link href={`/dashboard/staff/reservations/${r.id}`} className="dash-btn-sm">
                            View / Note
                          </Link>
                        </DashTableActionsInner>
                      </DashTableActionsCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>

      {/* Permissions notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Limited access — Staff portal</p>
          <p className="mt-0.5 text-amber-800/80">
            You can view reservations, add support notes, and flag escalations. Core financial settings,
            room deletion, and subscription changes require admin access.
          </p>
        </div>
      </div>
    </div>
  );
}

