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
php artisan serve
```
