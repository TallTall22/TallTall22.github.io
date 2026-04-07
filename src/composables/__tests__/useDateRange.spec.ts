// src/composables/__tests__/useDateRange.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateDateRange,
  todayISO,
  addDays,
  diffDays,
} from '../useDateRange';

const FIXED_TODAY = '2026-04-06';

describe('todayISO', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TODAY + 'T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns today in YYYY-MM-DD format', () => {
    expect(todayISO()).toBe(FIXED_TODAY);
  });
});

describe('diffDays', () => {
  it('returns 0 for same date', () => {
    expect(diffDays('2025-08-01', '2025-08-01')).toBe(0);
  });
  it('returns 30 for a 30-day span', () => {
    expect(diffDays('2025-08-01', '2025-08-31')).toBe(30);
  });
  it('returns negative for reversed range', () => {
    expect(diffDays('2025-08-31', '2025-08-01')).toBeLessThan(0);
  });
});

describe('addDays', () => {
  it('adds 30 days correctly', () => {
    expect(addDays('2025-08-01', 30)).toBe('2025-08-31');
  });
  it('handles month boundary', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
  });
  it('handles leap year Feb', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('validateDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TODAY + 'T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('MISSING_START when startDate is null', () => {
    const r = validateDateRange(null, null);
    expect(r.valid).toBe(false);
    expect(r.error).toBe('MISSING_START');
    expect(r.dayCount).toBe(0);
    expect(r.message).toBeTruthy();
  });

  it('START_IN_PAST for a date in the past', () => {
    const r = validateDateRange('2020-01-01', null);
    expect(r.valid).toBe(false);
    expect(r.error).toBe('START_IN_PAST');
  });

  it('MISSING_END when endDate is null', () => {
    const r = validateDateRange(FIXED_TODAY, null);
    expect(r.valid).toBe(false);
    expect(r.error).toBe('MISSING_END');
  });

  it('END_BEFORE_START when endDate < startDate', () => {
    const r = validateDateRange(FIXED_TODAY, addDays(FIXED_TODAY, -1));
    expect(r.valid).toBe(false);
    expect(r.error).toBe('END_BEFORE_START');
    expect(r.dayCount).toBe(0);
  });

  it('EXCEEDS_MAX_DAYS for range > 180 days', () => {
    const r = validateDateRange(FIXED_TODAY, addDays(FIXED_TODAY, 200));
    expect(r.valid).toBe(false);
    expect(r.error).toBe('EXCEEDS_MAX_DAYS');
    expect(r.dayCount).toBe(200);
    expect(r.message).toContain('200');
  });

  it('valid: true for same-day (0-day trip)', () => {
    const r = validateDateRange(FIXED_TODAY, FIXED_TODAY);
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
    expect(r.dayCount).toBe(0);
  });

  it('valid: true for a 30-day range', () => {
    const r = validateDateRange(FIXED_TODAY, addDays(FIXED_TODAY, 30));
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
    expect(r.dayCount).toBe(30);
  });

  it('valid: true for exactly 180-day range', () => {
    const r = validateDateRange(FIXED_TODAY, addDays(FIXED_TODAY, 180));
    expect(r.valid).toBe(true);
    expect(r.error).toBeNull();
    expect(r.dayCount).toBe(180);
  });

  it('message is null when valid', () => {
    const r = validateDateRange(FIXED_TODAY, addDays(FIXED_TODAY, 10));
    expect(r.message).toBeNull();
  });

  it('message is a non-empty string when invalid', () => {
    const r = validateDateRange(null, null);
    expect(typeof r.message).toBe('string');
    expect(r.message!.length).toBeGreaterThan(0);
  });
});
