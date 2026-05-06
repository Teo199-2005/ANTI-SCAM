"use client";

import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { ChevronDown, ChevronUp, Filter, ReceiptText } from "lucide-react";
import { Fragment } from "react";
import { useEffect, useState } from "react";

type ReservationRow = {
  id: number;
  reference_no: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  guest_count: number;
  reservation_fee: string;
  total_amount: string;
  xendit_payment_status: string | null;
  room?: { id: number; name: string };
  client?: { id: number; name: string; email: string };
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

const statusBadge: Record<string, string> = {
  confirmed:       "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  cancelled:       "dash-badge-rose",
  expired:         "dash-badge-slate",
  no_show:         "dash-badge-rose",
  completed:       "dash-badge-navy",
};

export default function ResortReservationsPage() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextStatus = status) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ApiEnvelope<{ data: ReservationRow[] }>>("/reservations", {
        params: { status: nextStatus || undefined, perPage: 30 },
      });
      setRows(data.data.data ?? []);
      setError(null);
    } catch (err) {
      setError("Unable to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <ReceiptText size={24} className="text-skyBlue" />
          Reservations
        </h1>
        <p className="dash-page-sub">Track booking status, guest details, and payment states.</p>
      </div>

      <div className="dash-card dash-filter-bar items-stretch p-4 md:items-end">
        <div className="min-w-48 flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Status filter</label>
          <select className="dash-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending_payment">pending_payment</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
            <option value="expired">expired</option>
            <option value="no_show">no_show</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <button type="button" className="dash-btn-primary" onClick={() => void load(status)}>
          <Filter size={14} />
          Apply
        </button>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={4} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No reservations found for this filter.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((item) => {
              const expanded = openId === item.id;
              return (
                <DashMobileTableCard
                  key={item.id}
                  title={item.reference_no}
                  fields={[
                    {
                      label: "Dates",
                      value: `${item.check_in_date} → ${item.check_out_date}`,
                    },
                    { label: "Guests", value: item.guest_count },
                    { label: "Total", value: `₱${Number(item.total_amount).toLocaleString()}` },
                    {
                      label: "Status",
                      value: <span className={statusBadge[item.status] ?? "dash-badge-slate"}>{item.status}</span>,
                    },
                  ]}
                  actions={
                    <>
                      <button
                        type="button"
                        className="dash-btn-sm flex w-full items-center justify-center gap-2"
                        onClick={() => setOpenId(expanded ? null : item.id)}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? "Hide details" : "Show details"}
                      </button>
                      {expanded ? (
                        <div className="space-y-2 border-t border-softBorder pt-3 text-dash-sm text-zinc-700">
                          <p>
                            <span className="font-semibold text-zinc-500">Room</span>{" "}
                            {item.room?.name ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Guest</span>{" "}
                            {item.client?.name ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Email</span>{" "}
                            {item.client?.email ?? "—"}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Reservation fee</span>{" "}
                            <span className="text-emerald-700">₱{Number(item.reservation_fee).toLocaleString()}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-500">Payment</span>{" "}
                            {item.xendit_payment_status ?? "pending"}
                          </p>
                        </div>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <DataTable
          splitBodyRows
          headers={
            <>
              <th>Reference</th>
              <th>Dates</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
              <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={rows.length === 0} emptyText="No reservations found for this filter." withinTable colSpan={6}>
            {rows.map((item) => {
              const expanded = openId === item.id;
              return (
                <Fragment key={item.id}>
                  <tr>
                    <td className="font-semibold text-navy">{item.reference_no}</td>
                    <td className="text-zinc-600">
                      {item.check_in_date} to {item.check_out_date}
                    </td>
                    <td className="text-zinc-700">{item.guest_count}</td>
                    <td className="text-emerald-700">₱{Number(item.total_amount).toLocaleString()}</td>
                    <td>
                      <span className={statusBadge[item.status] ?? "dash-badge-slate"}>{item.status}</span>
                    </td>
                    <DashTableActionsCell>
                      <DashTableActionsInner>
                        <button
                          type="button"
                          className="dash-btn-sm"
                          onClick={() => setOpenId(expanded ? null : item.id)}
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Details
                        </button>
                      </DashTableActionsInner>
                    </DashTableActionsCell>
                  </tr>
                  <tr
                    className={`overflow-hidden transition-all duration-300 ${expanded ? "opacity-100" : "opacity-0 h-0"}`}
                  >
                    <td colSpan={6} className={`bg-softCard/40 ${expanded ? "p-0" : "py-0"}`}>
                      {expanded && (
                        <div className="dash-inset space-y-2 m-3">
                          <p>
                            Room: <span className="font-medium text-zinc-900">{item.room?.name ?? "—"}</span>
                          </p>
                          <p>
                            Guest: <span className="font-medium text-zinc-900">{item.client?.name ?? "—"}</span>
                          </p>
                          <p>
                            Email: <span className="font-medium text-zinc-900">{item.client?.email ?? "—"}</span>
                          </p>
                          <p>
                            Reservation fee:{" "}
                            <span className="font-medium text-emerald-700">₱{Number(item.reservation_fee).toLocaleString()}</span>
                          </p>
                          <p>
                            Payment status:{" "}
                            <span className="font-medium text-zinc-900">{item.xendit_payment_status ?? "pending"}</span>
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </AsyncStatePanel>
        </DataTable>
      </div>
    </div>
  );
}

