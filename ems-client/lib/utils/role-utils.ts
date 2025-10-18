/**
 * Utility functions for role handling and display
 */

export type UserRole = 'ADMIN' | 'USER' | 'SPEAKER';

/**
 * Maps backend role to user-friendly display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'USER':
      return 'Attendee';
    case 'ADMIN':
      return 'Administrator';
    case 'SPEAKER':
      return 'Speaker';
    default:
      return 'User';
  }
}

/**
 * Maps backend role to lowercase display name
 */
export function getRoleDisplayNameLower(role: UserRole): string {
  return getRoleDisplayName(role).toLowerCase();
}

/**
 * Checks if user has admin privileges
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Checks if user can create events (admin or speaker)
 */
export function canCreateEvents(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SPEAKER';
}

/**
 * Checks if user can book events (user or admin)
 */
export function canBookEvents(role: UserRole): boolean {
  return role === 'USER' || role === 'ADMIN';
}
