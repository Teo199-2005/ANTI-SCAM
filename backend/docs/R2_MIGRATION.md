# Migrating existing uploads to Cloudflare R2

This app stores user media on either the Laravel **`public`** disk (`/storage/...` URLs) or **`s3`** (S3-compatible API — Cloudflare R2) controlled by `MEDIA_DISK` in `backend/.env`.

## 1. Cloudflare

1. Create an **R2 bucket**.
2. Create an **R2 API token** with read/write for that bucket (S3 credentials).
3. Attach a **public custom domain** (recommended) or enable public access; note the HTTPS base you will set as `AWS_URL`.

## 2. Laravel production `.env`

Set:

- `MEDIA_DISK=s3`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`, `AWS_ENDPOINT` (R2 S3 endpoint), `AWS_DEFAULT_REGION=auto`
- `AWS_URL=https://your-public-files-host` (must match the hostname of URLs users will load in the browser)

Run `php artisan config:clear` (or deploy without cached config) after changing env.

## 3. One-time copy of existing files

Objects are addressed by **key** (same as the relative path under `storage/app/public`, e.g. `avatars/xyz.jpg`, `rooms/12/abc.webp`).

From a machine with access to the VPS `backend/storage/app/public` directory and R2 credentials, sync with a tool that speaks S3 API to your endpoint, for example **rclone** or **aws s3 sync** with `--endpoint-url`:

- Source: local `storage/app/public/` contents (not the `public/storage` symlink — the real files under `storage/app/public`).
- Destination: R2 bucket root (keys = relative paths like `avatars/...`).

Ensure **Content-Type** is preserved for images (most sync tools do).

## 4. Update database URLs (optional but recommended)

Existing rows use `/storage/{key}` or full Laravel `APP_URL/storage/{key}`.

After files exist in R2 at the same keys, update string columns to the **public R2 URL** form:

`https://{AWS_URL host}/{key}`

Example SQL shape (adjust table/column names):

- `users.avatar_url`, `users.marketer_gov_id_document_url`
- `resorts.logo_url`, `resorts.background_image_url`
- `room_images`: keep `path` = key and set `disk` = `s3` (URLs are built via `Storage::disk('s3')->url(path)`)

You can script this in PHP/Tinker: for each row with `avatar_url` starting with `/storage/`, set to `rtrim(AWS_URL,'/').substr(avatar_url, strlen('/storage'))` with a leading `/` only if your keys are stored without a leading slash (Laravel `store()` returns keys without a leading slash).

## 5. Verify

- Open dashboards and landing pages; images should load from the R2 hostname.
- Upload a new file; confirm it appears in the bucket and the API returns the new URL.
- Delete/replace an image; confirm the object is removed or replaced in R2.

## Cloudflare (production)

Uploads (logo, room photos, profile) go to **`https://anti-scamph.com/api/backend/...`** or **`/api/upload/...`** — they do **not** upload to `files.anti-scamph.com`. The files subdomain is only for **reading** objects from R2.

| Setting | Recommendation |
|--------|----------------|
| **DNS `files.anti-scamph.com`** | R2 custom domain in bucket settings; prefer **DNS only** (grey cloud) for the files hostname unless you need Cloudflare features on that host |
| **Cache rules** on `anti-scamph.com` | **Bypass cache** for `/api/*` and `/_next/static/*` after each deploy (or purge all) so dashboard JS updates |
| **WAF** | Allow **POST** multipart to `/api/backend/*` and `/api/upload/*` |
| **Speed → Optimization** | Turn off **Rocket Loader** for the dashboard (can break uploads/progress) |
| **SSL/TLS** | Full (strict) on main site |
| **Origin timeouts** | Nginx `proxy_read_timeout` ≥ **300s** for large photo uploads through Next.js |

Verify R2 from the VPS after `.env` changes:

```bash
cd backend && php artisan config:clear && php artisan media:verify
```

## Monitoring

Use **Cloudflare** dashboard: **Traffic / Analytics** for HTTP, **R2** metrics for storage and operations. Optional **Logpush** for long-term HTTP or R2 logs. On the VPS, keep **nginx** access logs and Laravel logs for origin-side correlation.
