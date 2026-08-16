// Centralized date display. Every date in the app is rendered by a server
// component, so without an explicit timezone Node uses the host's — UTC on
// Netlify — which makes an order placed at 6pm Pacific show the next day's
// date. Override with the SITE_TIMEZONE env var (IANA name).
export const SITE_TIMEZONE = process.env.SITE_TIMEZONE || 'America/Los_Angeles'

/**
 * A true point in time (createdAt, paidAt, sentAt, …), shown in the store's
 * local timezone. Daylight saving is handled by the IANA zone itself.
 */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleDateString('en-US', { timeZone: SITE_TIMEZONE, ...options })
}

/** Same as formatDate, but including the time of day. */
export function formatDateTime(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleString('en-US', { timeZone: SITE_TIMEZONE, ...options })
}

/**
 * A calendar date with no meaningful time-of-day — COA testing dates, promo
 * start/end. These are entered via <input type="date"> and stored as UTC
 * midnight, so they must be read back in UTC: converting them to a western
 * timezone would roll them back to the previous day.
 */
export function formatCalendarDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', ...options })
}
