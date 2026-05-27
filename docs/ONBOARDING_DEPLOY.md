This document explains the changes made to implement the Hospitality Onboarding & Verification Process and how to test and deploy them.

What changed
- Frontend: `frontend/src/components/base/BaseFooter.vue` — added recommended legal disclaimer text to the footer.
- Frontend: `frontend/src/components/onboarding/steps/WizardStep6Verification.tsx` — added a short independence note banner to the verification step.
- Backend: `backend/resources/views/emails/onboarding.blade.php` — new email body (excludes footer disclaimer per request).
- Backend: `backend/app/Mail/OnboardingMailable.php` — new Mailable to send the onboarding email.
- Backend: `backend/app/Http/Controllers/OnboardingMailerController.php` — controller to send onboarding email to a recipient.
- Backend: `backend/routes/api.php` — new API route: POST `/v1/resorts/{resort}/send-onboarding-email` (authenticated) to send the onboarding email.

How to test locally
1) Frontend (Next/Vue):
   - Start the frontend dev server as you normally do (see `frontend/package.json` scripts). Verify the disclaimer appears in the site footer and the onboarding verification step shows the independence note.

2) Backend (Laravel):
   - Configure mail settings in `.env` (MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS).
   - Run `php artisan route:list` to confirm the new route is registered.
   - Use an authenticated API client to POST to `/api/v1/resorts/{resort}/send-onboarding-email` with JSON: `{ "email": "recipient@example.com" }`.
   - Confirm mail is sent (or queued) by checking logs or the configured mail driver.

Notes and caveats
- The frontend copy of the disclaimer is static in `BaseFooter.vue`. If you later want the footer text to be editable from admin settings or landing page payloads, wire it into `landingPage` computed payload.
- The frontend copy of the disclaimer is static in `BaseFooter.vue`. If you later want the footer text to be editable from admin settings or landing page payloads, wire it into `landingPage` computed payload.
- The backend controller now queues the mailable. For production you should configure a queue driver (Redis, database, SQS) and run a worker. Example (supervised) worker command:

```bash
# Start a worker that will process queued mail jobs (production example)
php artisan queue:work --queue=default --sleep=3 --tries=3
```

- The onboarding email intentionally excludes the footer disclaimer as requested.

If you want, I can:
- Wire a small frontend button in the resort owner dashboard to call the new `send-onboarding-email` route.
- Convert the mailable to queued sending and add a notification/response flow.

