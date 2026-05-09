/** Shared password for all seeded demo users (see backend DatabaseSeeder). */
export const DEMO_ACCOUNT_PASSWORD = "password" as const;

export type DemoAccount = {
  id: string;
  label: string;
  roleLabel: string;
  email: string;
  password: typeof DEMO_ACCOUNT_PASSWORD;
};

export const demoAccounts: DemoAccount[] = [
  {
    id: "admin",
    label: "Platform admin",
    roleLabel: "admin",
    email: "admin@resort.test",
    password: DEMO_ACCOUNT_PASSWORD,
  },
  {
    id: "owner",
    label: "Resort owner",
    roleLabel: "resort_owner",
    email: "owner@resort.test",
    password: DEMO_ACCOUNT_PASSWORD,
  },
  {
    id: "marketing",
    label: "Marketing partner",
    roleLabel: "marketing",
    email: "marketer@resort.test",
    password: DEMO_ACCOUNT_PASSWORD,
  },
  {
    id: "client",
    label: "Guest (client)",
    roleLabel: "client",
    email: "guest@resort.test",
    password: DEMO_ACCOUNT_PASSWORD,
  },
  {
    id: "user",
    label: "Registered user",
    roleLabel: "user",
    email: "user@resort.test",
    password: DEMO_ACCOUNT_PASSWORD,
  },
];
