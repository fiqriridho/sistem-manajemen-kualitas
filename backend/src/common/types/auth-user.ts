export const USER_ROLES = ['ADMIN', 'EVALUATOR', 'SUPERVISOR'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.some((role) => role === value);
}