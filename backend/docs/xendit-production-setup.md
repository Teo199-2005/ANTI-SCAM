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

**Booking invoices** (paid, expired, failed):

```text
POST https://your-api-domain.com/api/v1/webhooks/xendit/invoice
```

**Subscription invoices** (paid, expired, failed):

```text
POST https://your-api-domain.com/api/v1/webhooks/xendit/subscription-invoice
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

## 4) Verify end-to-end flow

1. Create reservation from frontend checkout.
2. Confirm Laravel returns a real `invoice_url` from Xendit.
3. Complete payment in Xendit-hosted page.
4. Confirm reservation changes to `confirmed` and `xendit_payment_status=paid`.
5. Confirm webhook events are visible in admin `xendit-logs`.
