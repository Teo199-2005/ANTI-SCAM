"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { getSuspensionList, SuspensionItem } from "@/lib/api/admin";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function SuspensionsPage() {
  const [items, setItems]   = useState<SuspensionItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const res = await getSuspensionList({ filter: f, perPage: 50 });
      setItems(res.data);
      setTotal(res.meta?.total ?? res.data.length);
      setError(null);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError("Failed to load suspensions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const statusClass = (s: string) =>
    s === "suspended" ? "dash-badge-rose" : s === "grace_period" ? "dash-badge-amber" : "dash-badge-slate";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <AlertTriangle size={22} className="text-amber-500" /> Suspensions & Grace Periods
        </h1>
        <p className="dash-page-sub">Resorts with overdue subscriptions in grace period or fully suspended.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "grace_period", "suspended"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === f ? "bg-navy text-white" : "border border-softBorder bg-softCard text-zinc-600 hover:bg-softGray"}`}
          >
            {f === "all" ? "All" : f === "grace_period" ? "Grace Period" : "Suspended"}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-zinc-400">{total} result{total !== 1 ? "s" : ""}</span>
      </div>

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="md:hidden p-4"><DashMobileTableSkeleton rows={3} /></div>
            <div className="hidden md:block space-y-2 p-4">{[1,2,3].map(i=><div key={i} className="h-16 animate-pulse rounded-xl bg-softGray"/>)}</div>
          </>
        ) : error ? (
          <p className="px-6 py-10 text-center text-sm text-rose-700">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">No resorts in this category.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {items.map((item) => (
                <DashMobileTableCard
                  key={item.subscriptionId}
                  title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span>{item.resort?.name ?? "—"}</span>
                      {item.resort?.isVip ? <span className="dash-badge-amber">VIP</span> : null}
                    </span>
                  }
                  fields={[
                    { label: "Address", value: item.resort?.address ?? "—" },
                    { label: "Plan", value: <span className="capitalize">{item.plan}</span> },
                    { label: "Monthly fee", value: `₱${Number(item.totalMonthlyFee).toLocaleString()}` },
                    { label: "Next due", value: item.nextDueDate },
                    { label: "Grace until", value: item.graceUntil ?? "—" },
                    {
                      label: "Status",
                      value: <span className={statusClass(item.status)}>{item.status.replaceAll("_", " ")}</span>,
                    },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Resort</th>
                    <th>Plan</th>
                    <th>Monthly Fee</th>
                    <th>Next Due</th>
                    <th>Grace Until</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.subscriptionId}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-navy">{item.resort?.name ?? "—"}</span>
                          {item.resort?.isVip ? (
                            <span className="dash-badge-amber">VIP</span>
                          ) : null}
                        </div>
                        {item.resort?.address ? <p className="text-xs text-zinc-400">{item.resort.address}</p> : null}
                      </td>
                      <td className="capitalize">{item.plan}</td>
                      <td>₱{Number(item.totalMonthlyFee).toLocaleString()}</td>
                      <td className="text-zinc-500">{item.nextDueDate}</td>
                      <td className="text-zinc-500">{item.graceUntil ?? "—"}</td>
                      <td><span className={statusClass(item.status)}>{item.status.replaceAll("_"," ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}

