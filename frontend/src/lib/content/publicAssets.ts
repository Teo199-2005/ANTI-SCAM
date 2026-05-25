/**
 * Static image paths under `frontend/public/` (organized by category).
 * Legacy flat URLs (e.g. `/login.png`) redirect via `next.config.ts`.
 */
export const publicAssets = {
  branding: {
    mainlogo: "/branding/mainlogo.png",
    mainlogoBimi: "/branding/mainlogo-bimi.png",
    rising2Brothers: "/branding/rising2brothers.png",
    verified: "/branding/verified.png",
  },
  auth: {
    loginHero: "/auth/login.png",
  },
  team: {
    ceo: "/team/CEO.png",
    cto: "/team/CTO.png",
    cmo: "/team/CMO.png",
    coo: "/team/COO.png",
  },
  marketing: {
    hero: "/marketing/coverphoto.png",
    program: "/marketing/program.png",
    poster1: "/marketing/poster1.png",
    poster12: "/marketing/poster12.png",
    founding500: "/marketing/founding500.png",
    theVisionaries: "/marketing/the-visionaries.png",
    bgResort: "/marketing/bgresort.png",
    phCircle: "/marketing/phcircle.png",
  },
  register: {
    guests: "/register/register-guests.png",
    resortOwner: "/register/register-resort-owner.png",
  },
  onboarding: {
    step: (n: number) => `/onboarding/step-${n}.png`,
  },
} as const;
