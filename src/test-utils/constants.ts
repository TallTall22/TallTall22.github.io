/**
 * Shared date constants for test files.
 * All dates use UTC noon (T12:00:00Z) to avoid off-by-one errors in UTC+ timezones.
 */

/** Fixed "today" used in useDateRange validation tests (set via vi.setSystemTime) */
export const TEST_TODAY_DATE_RANGE = '2026-04-06';

/** Fixed "today" used in useQuickStartPresets / preset application tests */
export const TEST_TODAY_PRESETS = '2025-07-01';
