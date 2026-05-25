# Production deploy — resort registration & verification

Use this checklist when shipping the 6-step owner wizard, verification queue, and related emails.

## Database

- [ ] Run migrations: `php artisan migrate --force`
- [ ] Confirm columns exist on `resorts`: `verification_rejection_reason`, `verification_submission_count`, `verification_assigned_to_user_id`, `verification_admin_notes`, `verification_scheduled_at`, `verification_scheduled_notes`

## Storage

- [ ] Set `FILESYSTEM_DISK` (local `public` or S3/R2)
- [ ] Local disk: `php artisan storage:link`
- [ ] Bucket/CORS allows browser uploads from the Next.js origin
- [ ] Verify uploads: `php artisan media:verify-storage` (if configured)

## Environment

- [ ] Mail transport configured (`MAIL_*`) — verification emails use `BrandedMailHtml`
- [ ] `APP_URL` matches the Laravel API base used by the frontend
- [ ] Frontend `NEXT_PUBLIC_API_URL` (or equivalent) points at production API
- [ ] `RESORT_REGISTRATION_WIZARD_ENABLED=true` (or unset if default on)

## Post-deploy smoke

- [ ] Owner: complete steps 1–6, receive “documents received” email
- [ ] Admin: sidebar badge on **Resort verification**, approve/reject/request docs
- [ ] Owner: rejection reason on dashboard banner; resubmit increments submission #
- [ ] Verified owner: can enable **Public listing** in resort profile
- [ ] Public catalog: only `verified` + `is_publicly_listed` resorts appear

## Legacy data

- [ ] Dry-run: `php artisan resort-registration:repair-incomplete --dry-run`
- [ ] Repair: `php artisan resort-registration:repair-incomplete`

## Automated tests

- [ ] Backend: `php artisan test --filter=ResortRegistrationWizardTest`
- [ ] Backend: `php artisan test --filter=AdminResortVerificationTest`
- [ ] Frontend E2E (optional): from `frontend/`, `npm install` then `npm run test:e2e` (Playwright)
