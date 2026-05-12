# Backend API

## Architecture
- `app/Modules/Auth`: auth endpoints and token lifecycle
- `app/Modules/Users`: full CRUD with controller + requests + service + repository + resource
- `app/Modules/Dashboard`: stats endpoint
- `app/Shared/Http/Responses`: standardized API payload envelope
- `app/Shared/Traits`: reusable response helpers

## API Response Contract
```json
{
  "success": true,
  "message": "",
  "data": {},
  "errors": null
}
```

## Key Patterns
- Service layer: business rules (`UserService`)
- Repository layer: data access (`EloquentUserRepository`)
- API resource layer: output normalization (`UserResource`)
- Authorization: `UserPolicy` + route middleware

## Run
```bash
composer install
php artisan migrate
composer run serve
```

**Uploads (logos, hero backgrounds, room photos):** Windows PHP defaults are often `upload_max_filesize=2M`, so large files never reach Laravel. Use one of:

- `composer run serve` (recommended), or
- **`serve.cmd`** in this folder (same limits as Composer), or
- Before `php artisan serve`, set `PHP_INI_SCAN_DIR` to the absolute path of `backend/.php-ini.d` (see `scripts/laravel-serve-with-upload-ini.php`).

Plain `php artisan serve` alone keeps host defaults; photos over ~2 MB will fail until you use one of the options above.

## Philippine locations (PSGC)

Reference geography is stored in `psgc_provinces`, `psgc_cities_municipalities`, and `psgc_barangays`. Demo rows come from `PsgcReferenceSeeder`; production data should be loaded from an official PSA/PSGC release (CSV or JSON published by PSA), not from unofficial scrapes.

**Import command** (expects three JSON files in a directory):

- `provinces.json` — `[{"code":"...","name":"..."}]`
- `cities.json` — `[{"code":"...","province_code":"...","name":"..."}]`
- `barangays.json` — `[{"code":"...","city_municipality_code":"...","name":"..."}]`

```bash
php artisan psgc:import /absolute/path/to/folder
```

Example layout is under `database/data/psgc/example/`. After preparing files from the official extract, run the command above to rebuild the three tables.

Public read APIs (cacheable): `GET /api/v1/public/locations/provinces`, `GET /api/v1/public/locations/provinces/{provinceCode}/cities`, `GET /api/v1/public/locations/cities/{cityCode}/barangays?per_page=300`.

**Product note:** Marketer “mailing” is captured only as PSGC barangay + city/municipality + province (plus a denormalized label). That may be insufficient for some banking or BIR paper forms that expect street lines; this is an intentional product scope choice.
