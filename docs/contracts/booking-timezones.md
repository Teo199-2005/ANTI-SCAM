# Booking dates and timezones

## Contract

- **Storage**: `reservations.check_in_date` and `check_out_date` are **DATE** columns (no time-of-day). They represent the **calendar date at the resort**, not an instant in UTC.
- **API**: The Laravel API exposes these as `YYYY-MM-DD` strings in JSON (`checkInDate` / `checkOutDate` in the SPA).
- **Display**: The marketing site and dashboards should show the same date strings returned by the API without shifting by the viewer’s local timezone (treat them as **opaque calendar labels**, not `Date` midnights in the user’s locale, unless you explicitly add resort TZ later).

## Why this matters

Night-ahead/night-behind bugs appear when a browser parses `"2026-06-01"` as UTC midnight and formats it in `Asia/Manila`, which can render as May 31 or June 2. Prefer string display for pure dates, or parse with a fixed offset agreed in the product (e.g. `Asia/Manila` for all PH resorts).

## Payments

- Xendit and webhooks operate in **real time**; reservation confirmation still keys off **invoice paid** + the same date fields above.
- The reconciliation job (`payments:reconcile-booking-invoices`) polls invoice status; it does not reinterpret stay dates.

## Future hardening (optional)

- Add `resorts.timezone` (IANA id) and document cutoffs for “day” boundaries, cancellation windows, and reporting.
- Store `check_in_at` / `check_out_at` as timestamptz only if you need true instants (e.g. international resorts).
