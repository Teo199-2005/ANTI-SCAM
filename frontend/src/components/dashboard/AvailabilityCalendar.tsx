import { ChevronLeft, ChevronRight } from "lucide-react";

type AvailabilityRecord = {
  id: number;
  start_date: string;
  end_date: string;
  status: "available" | "blocked" | "maintenance";
  reason?: string | null;
};

type Props = {
  records: AvailabilityRecord[];
  month: Date;
  onMonthChange?: (next: Date) => void;
};

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isInRange(day: string, start: string, end: string) {
  return day >= start && day <= end;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AvailabilityCalendar({ records, month, onMonthChange }: Props) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const totalDays = end.getDate();
  const offset = (start.getDay() + 6) % 7;
  const slots = Array.from({ length: offset + totalDays }, (_, idx) => {
    if (idx < offset) return null;
    return new Date(month.getFullYear(), month.getMonth(), idx - offset + 1);
  });

  const prevMonth = () => {
    if (onMonthChange) {
      onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    }
  };

  const nextMonth = () => {
    if (onMonthChange) {
      onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    }
  };

  return (
    <div className="dash-card p-4">
      {onMonthChange && (
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="dash-btn-sm"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-navy">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="dash-btn-sm"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
      <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-zinc-500" role="row">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} role="columnheader" aria-label={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2" role="grid" aria-label={`${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()} availability`}>
        {slots.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} role="gridcell" aria-hidden />;

          const ymd = toYmd(day);
          const dayRecord = records.find((item) => isInRange(ymd, item.start_date, item.end_date));
          const state = dayRecord?.status ?? "available";

          const cellClass =
            state === "blocked"
              ? "border-rose-200 bg-rose-50 text-rose-900"
              : state === "maintenance"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50/80 text-emerald-900";

          return (
            <time
              key={ymd}
              dateTime={ymd}
              role="gridcell"
              tabIndex={0}
              aria-label={`${day.getDate()} ${MONTH_NAMES[month.getMonth()]}: ${dayRecord?.reason ?? state}`}
              className={`rounded-lg border p-2 text-center text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/60 ${cellClass}`}
            >
              {day.getDate()}
            </time>
          );
        })}
      </div>
    </div>
  );
}
