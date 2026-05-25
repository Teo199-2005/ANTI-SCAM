# Static assets (`frontend/public`)

PNG artwork is grouped by purpose. Use paths from `src/lib/content/publicAssets.ts` in app code.

| Folder | Contents |
|--------|----------|
| `branding/` | mainlogo, mainlogo-bimi, rising2brothers, verified |
| `auth/` | login hero |
| `team/` | CEO, CTO, CMO, COO portraits |
| `marketing/` | coverphoto, program, posters, founding500, visionaries emblem, bgresort, phcircle |
| `register/` | register-guests, register-resort-owner role picker art |
| `onboarding/` | wizard step illustrations (step-1 … step-6) |
| `payment-icons/` | GCash, cards, Maya, 7-Eleven, banks |
| `patterns/` | UI textures |
| `textures/` | Background textures |

Legacy flat URLs (e.g. `/login.png`) redirect to these folders via `next.config.ts`.

**Verified badge:** place source art at `branding/verified-source.png`, then run `node frontend/scripts/process-verified-badge.mjs`.
