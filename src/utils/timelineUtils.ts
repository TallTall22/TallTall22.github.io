/**
 * F-08: Timeline Utility Functions
 *
 * Pure, side-effect-free helpers for timezone abbreviation extraction,
 * local-time formatting, and day-of-week derivation.
 *
 * Tasks: 2.2 (formatLocalTime + extractTimeZoneAbbr), 2.3 (deriveDayOfWeek),
 *        4.3 (error boundary on formatLocalTime)
 */

/**
 * Extracts the abbreviated timezone name (e.g. "EDT", "CDT", "PDT") for a
 * given IANA timezone string at a specific reference point in time.
 *
 * Uses Intl.DateTimeFormat.formatToParts() for DST-awareness.
 * Returns '' (empty string) if the timezone is invalid or Intl throws.
 *
 * @param ianaTimeZone - e.g. "America/New_York"
 * @param referenceDate - any Date object in the time period of interest
 */
export function extractTimeZoneAbbr(ianaTimeZone: string, referenceDate: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimeZone,
      timeZoneName: 'short',
    }).formatToParts(referenceDate);

    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Formats a game's local start time combined with the stadium's timezone abbreviation.
 *
 * Strategy:
 * 1. Parse `gameDate` (ISO "YYYY-MM-DD") + approximate noon UTC to get a Date
 *    in the right calendar day for timezone abbreviation extraction
 * 2. Call extractTimeZoneAbbr(ianaTimeZone, referenceDate) to get abbreviation
 * 3. If abbreviation is found, return `${startTimeLocal} ${abbr}` (e.g. "7:05 PM EDT")
 * 4. If abbreviation is empty (invalid zone), return `startTimeLocal` unchanged (no throw)
 *
 * @param startTimeLocal - from game data, e.g. "7:05 PM"
 * @param ianaTimeZone - IANA timezone string of the stadium
 * @param gameDate - ISO date string "YYYY-MM-DD"
 */
export function formatLocalTime(
  startTimeLocal: string,
  ianaTimeZone: string,
  gameDate: string,
): string {
  // Use approximate noon UTC — only need the calendar day for DST-aware TZ abbreviation
  const referenceDate = new Date(`${gameDate}T18:00:00Z`);

  const abbr = extractTimeZoneAbbr(ianaTimeZone, referenceDate);

  if (abbr === '') {
    if (import.meta.env.DEV) {
      console.warn('[formatLocalTime] Invalid timezone:', ianaTimeZone);
    }
    return startTimeLocal;
  }

  return `${startTimeLocal} ${abbr}`;
}

/**
 * Returns abbreviated day-of-week for an ISO date string (e.g. "Mon", "Tue").
 * Uses UTC timezone to avoid local-TZ off-by-one on bare "YYYY-MM-DD" strings.
 * Returns '' for invalid date input (no throw).
 *
 * @param isoDate - "YYYY-MM-DD"
 */
export function deriveDayOfWeek(isoDate: string): string {
  try {
    const date = new Date(`${isoDate}T12:00:00Z`);

    // Detect invalid date (NaN timestamp)
    if (isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return '';
  }
}
