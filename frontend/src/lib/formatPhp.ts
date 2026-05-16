function coerceNumber(amount: unknown): number | null {
  if (amount === null || amount === undefined || amount === "") return null;
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : null;
  if (typeof amount === "string") {
    const trimmed = amount.trim().replace(/,/g, "");
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Default UI: ₱ + en-PH grouping; fractions only when non-integral; invalid → — */
export function formatPhp(amount: unknown): string {
  const n = coerceNumber(amount);
  if (n === null) return "—";
  const hasFraction = Math.abs(n % 1) > 1e-9;
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPhpPerNight(amount: unknown): string {
  const core = formatPhp(amount);
  if (core === "—") return "—";
  return `${core}/night`;
}

/** Compact calendar cell label, e.g. ₱7.5K */
export function formatPhpCompact(amount: unknown): string {
  const n = coerceNumber(amount);
  if (n === null) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `₱${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `₱${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return formatPhp(amount);
}

/** Two decimal places (fee breakdown rows, parity with ledgers when precision matters). */
export function formatPhpCents(amount: unknown): string {
  const n = coerceNumber(amount);
  if (n === null) return "—";
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Guest-friendly stay dates, e.g. "June 18 → 19, 2026" */
export function formatStayRange(checkIn: string | null | undefined, checkOut?: string | null): string {
  if (!checkIn) return "—";
  const inIso = checkIn.slice(0, 10);
  const outIso = checkOut ? checkOut.slice(0, 10) : "";
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions): string => {
    const dt = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString("en-PH", opts);
  };
  const inYear = inIso.slice(0, 4);
  if (!outIso) {
    return fmt(inIso, { month: "long", day: "numeric", year: "numeric" });
  }
  const outYear = outIso.slice(0, 4);
  if (inYear === outYear) {
    return `${fmt(inIso, { month: "long", day: "numeric" })} → ${fmt(outIso, { month: "long", day: "numeric" })}, ${inYear}`;
  }
  return `${fmt(inIso, { month: "long", day: "numeric", year: "numeric" })} → ${fmt(outIso, { month: "long", day: "numeric", year: "numeric" })}`;
}

/** Ledger-style: coerce invalid → 0 then show two decimals. */

export function formatPhpLedger(amount: unknown): string {
  const n = coerceNumber(amount);
  const v = n === null ? 0 : n;
  return `₱${v.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
