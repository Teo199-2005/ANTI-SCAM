"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { fetchRoomAvailabilityCalendar } from "@/lib/api/public";
import { listResorts } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  applyStatusToDays,
  expandRange,
  isPastYmd,
  rangesToBlockedMap,
  toLocalYmd,
  type AvailabilityRange,
  type AvailabilityStatus,
} from "@/lib/calendar/availabilityDayMap";
import { formatPhpCompact } from "@/lib/formatPhp";
import { roomImagePreviewSrc } from "@/lib/roomImagePreview";
import { sanitizeLongText } from "@/lib/inputRestrictions";
import type { RoomImageRow } from "@/components/dashboard/RoomPhotosPanel";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RoomSummary = {
  id: number;
  name: string;
  base_price: string | number;
  status: string;
  /** undefined = loading thumbnail, null = no photo, string = image URL */
  thumbUrl?: string | null;
};

type RoomDetail = {
  id: number;
  name: string;
  base_price: string | number;
  status: string;
};

type ApiEnvelope<T> = { success: boolean; data: T };

type RoomsListApiBody = ApiEnvelope<{ data: RoomSummary[] }> | RoomSummary[];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function todayYmd() {
  return toLocalYmd(new Date());
}

function roomInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function fetchRoomThumbUrl(targetRoomId: number): Promise<string | null> {
  try {
    const imgRes = await apiClient.get<ApiEnvelope<RoomImageRow[]>>(`/rooms/${targetRoomId}/images`);
    const imgs = Array.isArray(imgRes.data?.data) ? imgRes.data.data : [];
    const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
    return primary && !primary.broken ? roomImagePreviewSrc(targetRoomId, primary) : null;
  } catch {
    return null;
  }
}

function dayOverlapsRecord(ymd: string, r: AvailabilityRange) {
  return ymd >= r.start_date && ymd <= r.end_date;
}

type Props = {
  roomId: number;
};

export default function RoomHostCalendar({ roomId }: Props) {
  const { pushToast } = useToast();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [records, setRecords] = useState<AvailabilityRange[]>([]);
  const [busyDays, setBusyDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [panelStatus, setPanelStatus] = useState<AvailabilityStatus>("blocked");
  const [reason, setReason] = useState("");
  const [priceDraft, setPriceDraft] = useState("");
  const [dailyRates, setDailyRates] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayYmd();

  const blockedMap = useMemo(() => rangesToBlockedMap(records), [records]);

  const basePriceNum = useMemo(() => Number(room?.base_price ?? 0), [room?.base_price]);

  const getPriceForDay = useCallback(
    (ymd: string) => {
      const override = dailyRates[ymd];
      if (override !== undefined) return override;
      return basePriceNum;
    },
    [dailyRates, basePriceNum],
  );

  const loadRoomList = useCallback(async () => {
    const resorts = await listResorts({ perPage: 10 });
    const resortId = resorts.data?.[0]?.id;
    if (!resortId) {
      setRooms([]);
      return;
    }

    const { data } = await apiClient.get<RoomsListApiBody>("/rooms", {
      params: { resort_id: resortId, perPage: 50, sort_by: "name", sort_dir: "asc" },
    });
    const inner = (data as ApiEnvelope<{ data: RoomSummary[] } | RoomSummary[]>).data;
    const rawList = Array.isArray(inner)
      ? inner
      : Array.isArray((inner as { data?: RoomSummary[] })?.data)
        ? (inner as { data: RoomSummary[] }).data
        : [];
    const base = rawList.map((r) => ({ ...r, thumbUrl: undefined as string | null | undefined }));
    setRooms(base);

    const thumbPairs = await Promise.all(
      base.map(async (r) => ({ id: r.id, thumbUrl: await fetchRoomThumbUrl(r.id) })),
    );
    const thumbById = new Map(thumbPairs.map((p) => [p.id, p.thumbUrl]));
    setRooms((prev) => prev.map((r) => ({ ...r, thumbUrl: thumbById.get(r.id) ?? null })));
  }, []);

  const loadRoomData = useCallback(async () => {
    const year = month.getFullYear();
    const monthNum = month.getMonth() + 1;

    const [roomRes, availRes, cal, ratesRes] = await Promise.all([
      apiClient.get<ApiEnvelope<RoomDetail>>(`/rooms/${roomId}`),
      apiClient.get<ApiEnvelope<{ data: AvailabilityRange[] }>>(`/rooms/${roomId}/availability`),
      fetchRoomAvailabilityCalendar(roomId, year, monthNum).catch(() => ({
        days: {} as Record<string, string>,
      })),
      apiClient
        .get<ApiEnvelope<{ base_price: number; rates: Record<string, number> }>>(
          `/rooms/${roomId}/daily-rates`,
          { params: { year, month: monthNum } },
        )
        .catch(() => ({ data: { data: { base_price: 0, rates: {} } } })),
    ]);
    setRoom(roomRes.data.data);
    const ratesPayload = ratesRes.data?.data ?? { rates: {} };
    setDailyRates(ratesPayload.rates ?? {});
    if (selected.size === 0) {
      setPriceDraft(String(roomRes.data.data?.base_price ?? ""));
    }
    const rows = availRes.data.data?.data ?? availRes.data.data;
    setRecords(Array.isArray(rows) ? rows : []);
    setBusyDays(cal.days ?? {});
  }, [roomId, month]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadRoomList();
      await loadRoomData();
    } catch {
      setError("Unable to load room calendar.");
    } finally {
      setLoading(false);
    }
  }, [loadRoomList, loadRoomData]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loading) {
      void loadRoomData().catch(() => {});
    }
  }, [month, loadRoomData, loading]);

  const syncAvailability = useCallback(
    async (nextStatus: AvailabilityStatus, selectedDays: string[], note: string | null) => {
      const afterMap = new Map(blockedMap);
      applyStatusToDays(afterMap, selectedDays, nextStatus);

      const toDelete = records.filter((r) => selectedDays.some((ymd) => dayOverlapsRecord(ymd, r)));
      const unionDays = new Set<string>(selectedDays);
      for (const r of toDelete) {
        expandRange(r.start_date, r.end_date).forEach((d) => unionDays.add(d));
      }

      const sortedUnion = [...unionDays].sort();
      const newRanges: Omit<AvailabilityRange, "id">[] = [];
      let i = 0;
      while (i < sortedUnion.length) {
        const start = sortedUnion[i]!;
        const status = afterMap.get(start);
        if (!status || status === "available") {
          i++;
          continue;
        }
        let end = start;
        let j = i + 1;
        while (j < sortedUnion.length) {
          const prev = new Date(end + "T12:00:00");
          prev.setDate(prev.getDate() + 1);
          const nextYmd = sortedUnion[j]!;
          if (toLocalYmd(prev) === nextYmd && afterMap.get(nextYmd) === status) {
            end = nextYmd;
            j++;
          } else {
            break;
          }
        }
        if (end >= today) {
          newRanges.push({
            start_date: start < today ? today : start,
            end_date: end,
            status,
            reason: note,
          });
        }
        i = j;
      }

      for (const r of toDelete) {
        if (r.id) await apiClient.delete(`/rooms/${roomId}/availability/${r.id}`);
      }
      for (const range of newRanges) {
        await apiClient.post(`/rooms/${roomId}/availability`, range);
      }

      const fresh = await apiClient.get<ApiEnvelope<{ data: AvailabilityRange[] }>>(
        `/rooms/${roomId}/availability`,
      );
      const rows = fresh.data.data?.data ?? fresh.data.data;
      setRecords(Array.isArray(rows) ? rows : []);
    },
    [blockedMap, records, roomId, today],
  );

  const scheduleAvailabilitySave = useCallback(
    (status: AvailabilityStatus) => {
      if (selected.size === 0) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          setSaving(true);
          try {
            const days = [...selected].filter((d) => !isPastYmd(d, today));
            if (days.length === 0) return;
            await syncAvailability(status, days, reason.trim() || null);
            pushToast({ title: "Changes saved", tone: "success" });
          } catch (err) {
            pushToast({
              title: "Could not save",
              description: parseApiErrorMessage(err, "Try again."),
              tone: "error",
            });
          } finally {
            setSaving(false);
          }
        })();
      }, 450);
    },
    [selected, syncAvailability, reason, pushToast, today],
  );

  useEffect(() => {
    if (selected.size === 0) {
      setPriceDraft(String(room?.base_price ?? ""));
      return;
    }
    const prices = [...selected].map((d) => getPriceForDay(d));
    setPriceDraft(String(prices[0] ?? ""));
  }, [selected, getPriceForDay, room?.base_price]);

  const saveSelectedRates = useCallback(async () => {
    const days = [...selected].filter((d) => !isPastYmd(d, today));
    if (days.length === 0) return;

    const n = Number(priceDraft);
    if (!Number.isFinite(n) || n < 0) {
      pushToast({ title: "Enter a valid nightly rate", tone: "error" });
      return;
    }

    setSavingRate(true);
    try {
      const res = await apiClient.post<ApiEnvelope<{ rates: Record<string, number> }>>(
        `/rooms/${roomId}/daily-rates`,
        { dates: days.sort(), nightly_price: n },
      );
      const newRates = res.data.data?.rates ?? {};
      setDailyRates((prev) => ({ ...prev, ...newRates }));
      pushToast({ title: "Nightly rate saved for selected dates", tone: "success" });
    } catch (err) {
      pushToast({
        title: "Could not save rate",
        description: parseApiErrorMessage(err, "Check the amount."),
        tone: "error",
      });
    } finally {
      setSavingRate(false);
    }
  }, [selected, priceDraft, roomId, pushToast, today]);

  const toggleDay = (ymd: string) => {
    if (isPastYmd(ymd, today)) return;
    if (busyDays[ymd] === "busy") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ymd)) next.delete(ymd);
      else next.add(ymd);
      return next;
    });
  };

  const getDayVisual = (ymd: string) => {
    if (busyDays[ymd] === "busy") return "booked" as const;
    const blocked = blockedMap.get(ymd);
    if (blocked === "maintenance") return "maintenance" as const;
    if (blocked === "blocked") return "blocked" as const;
    return "open" as const;
  };

  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const totalDays = end.getDate();
  const offset = (start.getDay() + 6) % 7;
  const slots = Array.from({ length: offset + totalDays }, (_, idx) => {
    if (idx < offset) return null;
    return new Date(month.getFullYear(), month.getMonth(), idx - offset + 1);
  });

  const selectionLabel =
    selected.size === 0
      ? null
      : selected.size === 1
        ? "1 night"
        : `${selected.size} nights`;

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-zinc-600">Loading calendar…</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Left: room thumbnails */}
      <aside className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-[72px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
        {rooms.map((r) => {
          const active = r.id === roomId;
          const thumbLoading = r.thumbUrl === undefined;
          return (
            <Link
              key={r.id}
              href={`/dashboard/resort/rooms/${r.id}/calendar`}
              title={r.name}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition lg:h-16 lg:w-16 ${
                active ? "border-navy ring-2 ring-navy/20" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {r.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : thumbLoading ? (
                <span className="flex h-full w-full animate-pulse items-center justify-center bg-zinc-200" aria-hidden />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-zinc-100 text-[10px] font-bold text-zinc-500">
                  {roomInitials(r.name)}
                </span>
              )}
            </Link>
          );
        })}
      </aside>

      {/* Center: calendar workspace */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/resort/rooms"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-navy"
            >
              <ArrowLeft size={14} />
              Back to rooms
            </Link>
            <h1 className="font-dash text-2xl font-semibold text-navy">{room?.name ?? "Room"} calendar</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Tap dates to edit availability and nightly rate.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-navy"
                value={`${month.getFullYear()}-${month.getMonth()}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  setMonth(new Date(y, m, 1));
                  setSelected(new Set());
                }}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 12 + i);
                  const val = `${d.getFullYear()}-${d.getMonth()}`;
                  return (
                    <option key={val} value={val}>
                      {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
            <span className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600">
              Month
            </span>
          </div>
        </div>

        {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-50"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-navy">
              {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
            </span>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-50"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {slots.map((day, index) => {
              if (!day) return <div key={`b-${index}`} aria-hidden className="min-h-[72px]" />;
              const ymd = toLocalYmd(day);
              const isPast = isPastYmd(ymd, today);
              const isSelected = selected.has(ymd);
              const visual = getDayVisual(ymd);
              const isBooked = visual === "booked";
              const nightPrice = getPriceForDay(ymd);
              const hasCustomRate = dailyRates[ymd] !== undefined;

              let card =
                "flex min-h-[72px] flex-col items-start justify-between rounded-2xl border p-2.5 text-left transition sm:min-h-[88px] sm:p-3 ";
              if (isSelected) {
                card += "border-navy bg-navy text-white shadow-md ";
              } else if (isPast) {
                card += "border-zinc-100 bg-zinc-50 text-zinc-400 ";
              } else if (isBooked) {
                card += "border-violet-200 bg-violet-50/90 text-violet-900 ";
              } else if (visual === "blocked") {
                card += "border-rose-200 bg-rose-50/80 text-rose-900 ";
              } else if (visual === "maintenance") {
                card += "border-amber-200 bg-amber-50/80 text-amber-900 ";
              } else {
                card += "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:shadow-sm ";
              }

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={isPast || isBooked}
                  onClick={() => toggleDay(ymd)}
                  className={`${card} disabled:cursor-not-allowed`}
                >
                  <span className={`text-lg font-semibold tabular-nums ${isSelected ? "text-white" : ""}`}>
                    {day.getDate()}
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      isSelected ? "text-white/90" : isBooked ? "text-violet-700" : "text-zinc-500"
                    }`}
                  >
                    {isBooked ? "Booked" : formatPhpCompact(nightPrice)}
                    {!isBooked && hasCustomRate ? (
                      <span className="sr-only"> (custom rate)</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: floating inspector */}
      <aside
        className={`w-full shrink-0 lg:sticky lg:top-4 lg:w-[300px] xl:w-[320px] ${
          selected.size > 0 ? "" : "opacity-90"
        }`}
      >
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-200/50">
          {selectionLabel ? (
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">{selectionLabel}</span>
              <button
                type="button"
                className="text-xs font-medium text-zinc-500 hover:text-navy"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="mb-4 text-sm text-zinc-500">Select one or more dates on the calendar to edit.</p>
          )}

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Availability</p>
          <div className="mb-4 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1" role="group" aria-label="Availability">
            {(
              [
                { key: "blocked" as const, icon: X, label: "Blocked" },
                { key: "available" as const, icon: Check, label: "Open" },
                { key: "maintenance" as const, icon: Wrench, label: "Maint." },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                disabled={selected.size === 0 || saving}
                onClick={() => {
                  setPanelStatus(key);
                  scheduleAvailabilitySave(key);
                }}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition ${
                  panelStatus === key ? "bg-white text-navy shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                } disabled:opacity-40`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Nightly rate</p>
          <div className="mb-4 rounded-2xl bg-navy p-4 text-white">
            <label className="sr-only" htmlFor="host-calendar-price">
              Nightly rate
            </label>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-medium opacity-80">₱</span>
              <input
                id="host-calendar-price"
                type="number"
                min={0}
                step="0.01"
                className="w-full [appearance:textfield] bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:text-white/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/70">
              {selected.size > 0
                ? `Applies to ${selected.size} selected date${selected.size === 1 ? "" : "s"} only.`
                : `Room default: ${formatPhpCompact(basePriceNum)}. Select dates to set custom rates.`}
            </p>
            <button
              type="button"
              disabled={selected.size === 0 || savingRate || saving}
              onClick={() => void saveSelectedRates()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingRate ? <Loader2 size={16} className="animate-spin" /> : null}
              Save rate
            </button>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-700"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            Custom settings
            <ChevronDown size={16} className={`transition ${showAdvanced ? "rotate-180" : ""}`} />
          </button>
          {showAdvanced ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] font-medium text-zinc-500">Block / maintenance note (optional)</p>
              <textarea
              className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="e.g. Private event, renovation"
              value={reason}
              onChange={(e) => setReason(sanitizeLongText(e.target.value, 255))}
              />
            </div>
          ) : null}

          {saving ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" /> Selected
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded border border-violet-300 bg-violet-100" /> Booked
          </span>
          <span className="inline-flex items-center gap-1">
            <Ban size={10} /> Blocked
          </span>
        </div>
      </aside>
    </div>
  );
}
