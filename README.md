# ResortStaycation SaaS Platform

Production-ready monorepo with:
- `backend`: Laravel API (service/repository/resource architecture)
- `frontend`: Vue 3 + Vuetify 3 SPA (module-based structure)

## Folder Structure
- `backend/app/Modules/*`: domain modules (`Auth`, `Users`, `Dashboard`)
- `backend/app/Shared/*`: shared response and cross-cutting utilities
- `frontend/src/modules/*`: feature modules
- `frontend/src/components/base/*`: reusable UI system
- `frontend/src/composables/*`: shared UI logic (`useFormValidation`, `useTable`, `useNotifications`)
- `frontend/src/services/http/client.ts`: centralized API layer

## Reuse Strategy
- API responses are normalized in backend trait and frontend axios interceptors.
- Repetitive UI patterns are abstracted into `Base*` components.
- Business logic is isolated in backend services/repositories and frontend stores/services.

## Extend The System
1. Add a new backend module under `backend/app/Modules/<ModuleName>`.
2. Add API routes in `backend/routes/api.php`.
3. Add matching frontend module under `frontend/src/modules/<module-name>`.
4. Reuse base components/composables instead of duplicating logic.
