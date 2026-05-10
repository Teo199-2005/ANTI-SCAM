/** Shared password policy (aligned with registration / API expectations). */

export type PasswordPolicyChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
};

export type PasswordChecksWithMatch = PasswordPolicyChecks & { match: boolean };

export function getPasswordPolicyChecks(password: string): PasswordPolicyChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
}

export function passwordPolicyMet(checks: PasswordPolicyChecks): boolean {
  return checks.length && checks.upper && checks.lower && checks.number;
}

export function getPasswordChecksWithMatch(password: string, confirmation: string): PasswordChecksWithMatch {
  return {
    ...getPasswordPolicyChecks(password),
    match: password.length > 0 && password === confirmation,
  };
}

export function getPasswordStrengthDisplay(
  checks: PasswordPolicyChecks | PasswordChecksWithMatch,
): {
  passedCount: number;
  total: number;
  strengthLabel: string;
  strengthBarClass: string;
} {
  const values = Object.values(checks);
  const total = values.length;
  const passedCount = values.filter(Boolean).length;

  if (total === 4) {
    return {
      passedCount,
      total,
      strengthLabel: passedCount <= 1 ? "Weak" : passedCount <= 3 ? "Good" : "Strong",
      strengthBarClass: passedCount <= 1 ? "bg-rose-500" : passedCount <= 3 ? "bg-amber-500" : "bg-emerald-500",
    };
  }

  return {
    passedCount,
    total,
    strengthLabel: passedCount <= 2 ? "Weak" : passedCount <= 4 ? "Good" : "Strong",
    strengthBarClass: passedCount <= 2 ? "bg-rose-500" : passedCount <= 4 ? "bg-amber-500" : "bg-emerald-500",
  };
}
