# Xendit Production Setup Checklist

Use this checklist on the VPS before enabling live Xendit payments.

## 1) Required Laravel `.env` values

Set these in `backend/.env`:

```env
XENDIT_SECRET_KEY=xnd_production_your_secret_key
XENDIT_WEBHOOK_TOKEN=your_xendit_callback_token
FRONTEND_URL=https://your-frontend-domain.com
APP_URL=https://your-api-domain.com
```

Notes:
- `XENDIT_SECRET_KEY` must never be exposed to frontend code.
- `XENDIT_WEBHOOK_TOKEN` must match the token configured in Xendit dashboard.
- `FRONTEND_URL` is the default origin for booking and subscription invoice success/failure redirects when the browser does not send `checkout_return_base`.
- The Next.js app sends `checkout_return_base` (current `window.location.origin`) on reservation and subscription checkout so Xendit returns users to the **same host** as their session (e.g. tenant subdomain or production domain). Subdomains of `FRONTEND_URL`'s host, `*.localhost`, and optional `CHECKOUT_RETURN_HOSTS` are allowed server-side.
- `APP_URL` is used for your public API URL and webhook endpoint.

## 2) Xendit Dashboard webhooks

**Legacy Xendit “INVOICES” row (one URL for paid + expired + after expiry)** — use this in the old webhook page:

```text
https://your-api-domain.com/api/v1/webhooks/xendit/invoices
```

Keep both checkboxes enabled: “invoice expired” and “payment received after expiry”.

**Split URLs** (newer Xendit UI or if you prefer separate endpoints):

```text
POST https://your-api-domain.com/api/v1/webhooks/xendit/invoice          — guest bookings
POST https://your-api-domain.com/api/v1/webhooks/xendit/subscription-invoice — resort subscriptions
```

**Optional — expired/failed only** (Philippines; same token as above):

```text
POST https://your-api-domain.com/expired_xendit_ph.php
```

Equivalent API route:

```text
POST https://your-api-domain.com/api/v1/webhooks/xendit/expired-ph
```

Use the `.php` URL only if Xendit or ops asked for that filename; otherwise the main invoice URLs above are enough.

## 3) Apply config changes on server

After updating `.env`:

```bash
php artisan config:clear
php artisan config:cache
php artisan route:cache
```

## 4) Cloudflare: stop **403** “Just a moment…” on webhook tests

Xendit server-to-server calls are blocked if Cloudflare shows a challenge page.

**Security → WAF → Custom rules → Create rule**

- **Expression:** `(http.request.uri.path starts with "/api/v1/webhooks/xendit") or (http.request.uri.path eq "/expired_xendit_ph.php")`
- **Action:** Skip → all remaining custom rules (or disable Bot Fight / JS Challenge for these paths)

After saving, open in a browser (should be JSON, not a challenge page):

`https://anti-scamph.com/api/v1/webhooks/xendit/health`

Re-run **Test** on INVOICES and Payouts in Xendit — expect **200**, not 403.

## 5) If Xendit Webhook Logs show **Failed** (`invoice.status`)

Common causes on this stack:

1. **URL never reaches Laravel** — Public nginx proxies everything to Next.js. Either:
   - Add nginx `location ^~ /api/v1/webhooks/` → `http://127.0.0.1:8080` (see `frontend/deployment/nginx-next.example.conf`), **or**
   - Deploy the Next.js BFF route `src/app/api/v1/webhooks/[...path]/route.ts` and set `LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1`, then `npm run build` + `pm2 restart`.
2. **Wrong callback token** — `XENDIT_WEBHOOK_TOKEN` in `backend/.env` must match Xendit → Settings → Webhooks (Test vs Live use different tokens).
3. **Test vs Live mismatch** — Test Mode webhooks need the **test** secret + token; Live needs production keys.

**Quick check on VPS:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  "https://anti-scamph.com/api/v1/webhooks/xendit/invoice" \
  -H "Content-Type: application/json" \
  -H "x-callback-token: YOUR_TOKEN" \
  -d '{"id":"test","status":"EXPIRED","event":"invoice.status"}'
```

Expect **200** (or **401** if token is wrong — fix `.env`, not the URL).

## 6) Optional: pilot pricing (flat ₱1 per Xendit invoice)

For live Xendit smoke tests without real amounts, set in `backend/.env`:

```env
PRICING_PILOT_MODE=true
PRICING_PILOT_AMOUNT=1
```

On the Next.js app, set matching public vars so subscribe/marketing UI matches checkout:

```env
NEXT_PUBLIC_PRICING_PILOT_MODE=true
NEXT_PUBLIC_PRICING_PILOT_AMOUNT=1
```

Then `php artisan config:clear` (and rebuild the frontend). **Turn pilot mode off** before real customers pay normal prices. After disabling, refresh resort subscriptions (or rely on the next `refreshForResort`) so `base_price` / `extra_room_fee` in the database match production again.

## 7) Card auto-renewal (Xendit Recurring)

Enable only after Xendit enables **Subscriptions / Recurring** on your merchant account.

```env
XENDIT_RECURRING_ENABLED=true
# Optional separate token for recurring webhooks; defaults to XENDIT_WEBHOOK_TOKEN
# XENDIT_RECURRING_WEBHOOK_TOKEN=
```

Register this webhook URL in Xendit (same `x-callback-token` header as invoice webhooks unless you set `XENDIT_RECURRING_WEBHOOK_TOKEN`):

```text
POST https://your-api-domain.com/api/v1/webhooks/xendit/recurring
```

Behavior:

- **Card (CREDIT_CARD)** at subscribe: first invoice checkout, then a recurring plan is created after payment (Visa, Mastercard, JCB). Future cycles extend the subscription via the recurring webhook; the cron job does **not** create duplicate manual invoices.
- **GCash / other methods**: one-time invoice per checkout; owners receive manual renewal invoices from `subscriptions:generate-invoices` when due.
- **Pilot mode** (`PRICING_PILOT_MODE=true`): recurring plan creation is skipped even when `XENDIT_RECURRING_ENABLED=true`.

Owners cancel auto-renewal from the dashboard subscription details menu (`POST /api/v1/resorts/{resort}/subscriptions/cancel-recurring`). Access remains until the current `billing_cycle_end`.

## 8) Verify end-to-end flow

1. Create reservation from frontend checkout.
2. Confirm Laravel returns a real `invoice_url` from Xendit.
3. Complete payment in Xendit-hosted page.
4. Confirm reservation changes to `confirmed` and `xendit_payment_status=paid`.
5. Confirm webhook events are visible in admin `xendit-logs`.
6. For subscriptions: subscribe with **Card**, confirm `billing_mode=auto_card` after payment; subscribe with **GCash**, confirm renewals stay manual.

