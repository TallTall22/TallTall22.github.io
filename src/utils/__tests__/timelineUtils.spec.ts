import { describe, it, expect } from 'vitest'
import { extractTimeZoneAbbr, formatLocalTime, deriveDayOfWeek } from '../timelineUtils'

describe('extractTimeZoneAbbr', () => {
  it('returns EDT for America/New_York in summer', () => {
    const result = extractTimeZoneAbbr('America/New_York', new Date('2026-07-04T20:00:00Z'))
    expect(result).toBe('EDT')
  })

  it('returns CDT for America/Chicago in spring', () => {
    const result = extractTimeZoneAbbr('America/Chicago', new Date('2026-04-06T20:00:00Z'))
    expect(result).toBe('CDT')
  })

  it('returns PDT for America/Los_Angeles in spring', () => {
    const result = extractTimeZoneAbbr('America/Los_Angeles', new Date('2026-04-06T20:00:00Z'))
    expect(result).toBe('PDT')
  })

  it('returns MDT for America/Denver in spring', () => {
    const result = extractTimeZoneAbbr('America/Denver', new Date('2026-04-06T20:00:00Z'))
    expect(result).toBe('MDT')
  })

  it('returns EST for America/New_York in November (standard time)', () => {
    const result = extractTimeZoneAbbr('America/New_York', new Date('2026-11-15T20:00:00Z'))
    expect(result).toBe('EST')
  })

  it('returns CST for America/Chicago in November (standard time)', () => {
    const result = extractTimeZoneAbbr('America/Chicago', new Date('2026-11-15T20:00:00Z'))
    expect(result).toBe('CST')
  })

  it('returns PST for America/Los_Angeles in November (standard time)', () => {
    const result = extractTimeZoneAbbr('America/Los_Angeles', new Date('2026-11-15T20:00:00Z'))
    expect(result).toBe('PST')
  })

  it('returns empty string for invalid timezone (no throw)', () => {
    const result = extractTimeZoneAbbr('Invalid/Zone', new Date())
    expect(result).toBe('')
  })
})

describe('formatLocalTime', () => {
  it('appends timezone abbreviation to local time', () => {
    const result = formatLocalTime('7:05 PM', 'America/New_York', '2026-07-04')
    expect(result).toBe('7:05 PM EDT')
  })

  it('returns startTimeLocal unchanged for invalid timezone (no throw)', () => {
    const result = formatLocalTime('6:05 PM', 'Invalid/Zone', '2026-04-06')
    expect(result).toBe('6:05 PM')
  })

  it('handles CDT timezone', () => {
    const result = formatLocalTime('6:05 PM', 'America/Chicago', '2026-04-06')
    expect(result).toBe('6:05 PM CDT')
  })

  it('appends EST timezone abbreviation in winter', () => {
    const result = formatLocalTime('7:05 PM', 'America/New_York', '2026-11-15')
    expect(result).toBe('7:05 PM EST')
  })
})

describe('deriveDayOfWeek', () => {
  it('returns Mon for 2026-04-06', () => {
    expect(deriveDayOfWeek('2026-04-06')).toBe('Mon')
  })

  it('returns Sat for 2026-07-04', () => {
    expect(deriveDayOfWeek('2026-07-04')).toBe('Sat')
  })

  it('returns empty string for invalid date (no throw)', () => {
    expect(deriveDayOfWeek('invalid-date')).toBe('')
  })
})
