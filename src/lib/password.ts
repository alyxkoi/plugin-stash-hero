// Shared password policy: at least 6 chars AND at least 1 number.
export const PASSWORD_RULE_MESSAGE =
  "Password must be at least 6 characters and include at least 1 number.";

export function validatePassword(pw: string): string | null {
  if (pw.length < 6) return PASSWORD_RULE_MESSAGE;
  if (!/\d/.test(pw)) return PASSWORD_RULE_MESSAGE;
  return null;
}
