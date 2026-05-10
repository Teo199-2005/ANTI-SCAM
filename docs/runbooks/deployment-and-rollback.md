# Deployment and rollback

## Environments

- **Development**: local SQLite or Docker MySQL/Redis (`deploy/docker-compose.infra.yml`), `QUEUE_CONNECTION` often `sync` or `database`.
- **Staging**: mirrors production sizing at smaller scale; separate Xendit test keys, real SMTP sandbox, and distinct `APP_KEY` / DB credentials.
- **Production**: managed database, Redis for cache/queue, TLS termination at load balancer, secrets in a vault (not only `.env` on disk).

## Deployment flow (Laravel API)

1. Enable maintenance mode only for breaking migrations: `php artisan down --retry=60` (optional).
2. Pull release artifact or `git fetch && git checkout <tag>`.
3. Install dependencies: `composer install --no-dev --optimize-autoloader`.
4. Run migrations: `php artisan migrate --force`.
5. Clear and rebuild caches: `php artisan config:cache && php artisan route:cache && php artisan view:cache`.
6. Restart queue workers and scheduler (Supervisor/systemd): `php artisan queue:restart`.
7. Re-enable traffic: `php artisan up`.

## Rollback

1. Check out the previous known-good release tag.
2. Run `composer install --no-dev --optimize-autoloader`.
3. If the bad release ran **backward-incompatible** migrations, restore DB from snapshot taken pre-deploy, then `php artisan migrate --force` only if needed.
4. `php artisan config:cache && php artisan queue:restart`.

**Rule**: never roll back application code without a matching database state; prefer forward-fix migrations when possible.

## Workers

- Run at least one `queue:work redis --sleep=1 --tries=3` (or database driver) process per queue.
- Scheduler: single cron host running `php artisan schedule:run` each minute.
- After deploy, always `queue:restart` so workers pick up new code.

## Health

- HTTP: Laravel `GET /up` (load balancer health check).
- Deep checks: optional authenticated route verifying DB + Redis (add when needed).
