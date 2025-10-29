/**
 * Simple timezone handling for CDT display
 * Backend uses UTC, frontend displays in CDT
 */

export const USER_TIMEZONE = 'America/Chicago'; // CDT for Texas

/**
 * Format time in CDT for display
 */
export function formatLocalTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    timeZone: USER_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Get current time (JavaScript handles timezone automatically)
 */
export function getCurrentLocalTime(): Date {
  return new Date();
}

/**
 * Format time difference as human readable string
 */
export function formatTimeDifference(date1: Date | string, date2: Date | string): string {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const minutes = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60));
  
  if (minutes < 0) {
    const absMinutes = Math.abs(minutes);
    if (absMinutes < 60) {
      return `${absMinutes} minutes ago`;
    } else if (absMinutes < 1440) { // 24 hours
      const hours = Math.floor(absMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(absMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  } else if (minutes === 0) {
    return 'now';
  } else {
    if (minutes < 60) {
      return `in ${minutes} minutes`;
    } else if (minutes < 1440) { // 24 hours
      const hours = Math.floor(minutes / 60);
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
  }
}
