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

/** Two decimal places (fee breakdown rows, parity with ledgers when precision matters). */
export function formatPhpCents(amount: unknown): string {
  const n = coerceNumber(amount);
  if (n === null) return "—";
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
