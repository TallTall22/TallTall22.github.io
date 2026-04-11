// src/composables/__tests__/useGameFilter.spec.ts
import { describe, it, expect } from 'vitest';
import type { Game } from '@/types/models';
import {
  filterByDateRange,
  filterHomeOnly,
  deduplicateByGameId,
  sortByDate,
  applyGameFilters,
} from '../useGameFilter';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId:         'test-game-001',
    date:           '2026-06-15',
    dayOfWeek:      'Monday',
    homeTeamId:     '147',
    awayTeamId:     '111',
    startTimeLocal: '7:05 PM',
    startTimeUtc:   '2026-06-15T23:05:00Z',
    venue:          'Yankee Stadium',
    ...overrides,
  };
}

// ── filterByDateRange ─────────────────────────────────────────────────────────

describe('filterByDateRange', () => {
  const games = [
    makeGame({ gameId: 'g1', date: '2026-05-31' }),
    makeGame({ gameId: 'g2', date: '2026-06-01' }),  // startDate
    makeGame({ gameId: 'g3', date: '2026-06-15' }),
    makeGame({ gameId: 'g4', date: '2026-06-30' }),  // endDate
    makeGame({ gameId: 'g5', date: '2026-07-01' }),
  ];
  const options = { startDate: '2026-06-01', endDate: '2026-06-30' };

  it('retains game on startDate (inclusive left boundary)', () => {
    const result = filterByDateRange(games, options);
    expect(result.map(g => g.gameId)).toContain('g2');
  });

  it('retains game on endDate (inclusive right boundary)', () => {
    const result = filterByDateRange(games, options);
    expect(result.map(g => g.gameId)).toContain('g4');
  });

  it('excludes game before startDate', () => {
    const result = filterByDateRange(games, options);
    expect(result.map(g => g.gameId)).not.toContain('g1');
  });

  it('excludes game after endDate', () => {
    const result = filterByDateRange(games, options);
    expect(result.map(g => g.gameId)).not.toContain('g5');
  });

  it('returns empty array for empty input', () => {
    expect(filterByDateRange([], options)).toEqual([]);
  });

  it('returns empty array when all games are outside range', () => {
    const outOfRange = [
      makeGame({ gameId: 'out1', date: '2025-01-01' }),
      makeGame({ gameId: 'out2', date: '2027-12-31' }),
    ];
    expect(filterByDateRange(outOfRange, options)).toHaveLength(0);
  });

  it('retains game when startDate === endDate (single-day range)', () => {
    const singleDay = [makeGame({ gameId: 'exact', date: '2026-06-15' })];
    const result = filterByDateRange(singleDay, { startDate: '2026-06-15', endDate: '2026-06-15' });
    expect(result).toHaveLength(1);
    expect(result[0].gameId).toBe('exact');
  });
});

// ── filterHomeOnly ────────────────────────────────────────────────────────────

describe('filterHomeOnly', () => {
  it('retains games with non-empty homeTeamId', () => {
    const games = [makeGame({ homeTeamId: '147' })];
    expect(filterHomeOnly(games)).toHaveLength(1);
  });

  it('removes games with empty string homeTeamId (data anomaly guard)', () => {
    const games = [makeGame({ homeTeamId: '' })];
    expect(filterHomeOnly(games)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterHomeOnly([])).toEqual([]);
  });

  it('keeps multiple valid games', () => {
    const games = [
      makeGame({ gameId: 'g1', homeTeamId: '147' }),
      makeGame({ gameId: 'g2', homeTeamId: '111' }),
    ];
    expect(filterHomeOnly(games)).toHaveLength(2);
  });
});

// ── deduplicateByGameId ───────────────────────────────────────────────────────

describe('deduplicateByGameId', () => {
  it('returns duplicatesRemoved = 0 when no duplicates', () => {
    const games = [
      makeGame({ gameId: 'g1' }),
      makeGame({ gameId: 'g2' }),
    ];
    const { unique, duplicatesRemoved } = deduplicateByGameId(games);
    expect(duplicatesRemoved).toBe(0);
    expect(unique).toHaveLength(2);
  });

  it('removes one duplicate: same gameId twice', () => {
    const games = [
      makeGame({ gameId: 'dup', venue: 'First Entry' }),
      makeGame({ gameId: 'dup', venue: 'Second Entry' }),
    ];
    const { unique, duplicatesRemoved } = deduplicateByGameId(games);
    expect(duplicatesRemoved).toBe(1);
    expect(unique).toHaveLength(1);
  });

  it('last entry wins when gameId is duplicated (Map semantics)', () => {
    const games = [
      makeGame({ gameId: 'dup', venue: 'First Entry' }),
      makeGame({ gameId: 'dup', venue: 'Second Entry' }),
    ];
    const { unique } = deduplicateByGameId(games);
    expect(unique[0].venue).toBe('Second Entry');
  });

  it('handles empty input', () => {
    const { unique, duplicatesRemoved } = deduplicateByGameId([]);
    expect(unique).toHaveLength(0);
    expect(duplicatesRemoved).toBe(0);
  });

  it('counts duplicatesRemoved correctly for multiple duplicates', () => {
    const games = [
      makeGame({ gameId: 'a' }),
      makeGame({ gameId: 'a' }),
      makeGame({ gameId: 'b' }),
      makeGame({ gameId: 'b' }),
      makeGame({ gameId: 'b' }),
    ];
    const { unique, duplicatesRemoved } = deduplicateByGameId(games);
    expect(unique).toHaveLength(2);
    expect(duplicatesRemoved).toBe(3);
  });
});

// ── sortByDate ────────────────────────────────────────────────────────────────

describe('sortByDate', () => {
  it('sorts games by date ASC', () => {
    const games = [
      makeGame({ gameId: 'g3', date: '2026-06-30' }),
      makeGame({ gameId: 'g1', date: '2026-06-01' }),
      makeGame({ gameId: 'g2', date: '2026-06-15' }),
    ];
    const sorted = sortByDate(games);
    expect(sorted.map(g => g.gameId)).toEqual(['g1', 'g2', 'g3']);
  });

  it('uses startTimeUtc as tiebreaker for same-date games', () => {
    const games = [
      makeGame({ gameId: 'evening',   date: '2026-06-15', startTimeUtc: '2026-06-16T02:15:00Z' }),
      makeGame({ gameId: 'afternoon', date: '2026-06-15', startTimeUtc: '2026-06-15T19:05:00Z' }),
    ];
    const sorted = sortByDate(games);
    expect(sorted[0].gameId).toBe('afternoon');
    expect(sorted[1].gameId).toBe('evening');
  });

  it('does not mutate the original array', () => {
    const original = [
      makeGame({ gameId: 'g2', date: '2026-06-30' }),
      makeGame({ gameId: 'g1', date: '2026-06-01' }),
    ];
    const originalFirst = original[0].gameId;
    sortByDate(original);
    expect(original[0].gameId).toBe(originalFirst); // original unchanged
  });

  it('returns single-element array unchanged', () => {
    const games = [makeGame({ gameId: 'solo' })];
    expect(sortByDate(games)).toHaveLength(1);
    expect(sortByDate(games)[0].gameId).toBe('solo');
  });

  it('returns empty array for empty input', () => {
    expect(sortByDate([])).toEqual([]);
  });
});

// ── applyGameFilters (pipeline integration) ───────────────────────────────────

describe('applyGameFilters', () => {
  const options = { startDate: '2026-06-01', endDate: '2026-06-30' };

  it('rawCount equals total input game count (before any filter)', () => {
    const games = [
      makeGame({ gameId: 'g1', date: '2026-05-01' }), // outside range
      makeGame({ gameId: 'g2', date: '2026-06-15' }), // in range
    ];
    const result = applyGameFilters(games, options);
    expect(result.rawCount).toBe(2);
  });

  it('filteredCount equals count after homeOnly + date filter (before dedup)', () => {
    const games = [
      makeGame({ gameId: 'dup', date: '2026-06-15' }),
      makeGame({ gameId: 'dup', date: '2026-06-15' }), // same id, counts as 2 before dedup
      makeGame({ gameId: 'out', date: '2026-05-01' }),  // outside range
    ];
    const result = applyGameFilters(games, options);
    expect(result.filteredCount).toBe(2); // 2 pass homeOnly+date filter, before dedup
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.games).toHaveLength(1);
  });

  it('returns empty games array when no games fall in date range', () => {
    const games = [makeGame({ gameId: 'g1', date: '2026-01-01' })];
    const result = applyGameFilters(games, options);
    expect(result.games).toHaveLength(0);
    expect(result.filteredCount).toBe(0);
    expect(result.rawCount).toBe(1);
  });

  it('returns sorted games in the final output', () => {
    const games = [
      makeGame({ gameId: 'g3', date: '2026-06-30' }),
      makeGame({ gameId: 'g1', date: '2026-06-01' }),
    ];
    const result = applyGameFilters(games, options);
    expect(result.games[0].gameId).toBe('g1');
    expect(result.games[1].gameId).toBe('g3');
  });

  it('duplicatesRemoved is 0 when no duplicates exist', () => {
    const games = [
      makeGame({ gameId: 'g1', date: '2026-06-01' }),
      makeGame({ gameId: 'g2', date: '2026-06-15' }),
    ];
    const result = applyGameFilters(games, options);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it('handles empty input array', () => {
    const result = applyGameFilters([], options);
    expect(result.games).toHaveLength(0);
    expect(result.rawCount).toBe(0);
    expect(result.filteredCount).toBe(0);
    expect(result.duplicatesRemoved).toBe(0);
  });
});
