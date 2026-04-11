// src/services/__tests__/gameService.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadGames, _clearGameCache, _setGameJsonLoader } from '@/services/gameService';
import type { Game } from '@/types/models';

// ── Fixtures ────────────────────────────────────────────────────────────────

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

const VALID_GAMES: Game[] = [
  makeGame({ gameId: 'game-001' }),
  makeGame({ gameId: 'game-002', homeTeamId: '111', awayTeamId: '147' }),
];

// ── Mock setup ───────────────────────────────────────────────────────────────
//
// `mockGamesData` is prefixed with "mock" so Vitest's hoisting transform also
// hoists this variable alongside vi.mock(), making it safely referenceable
// inside the factory.  The getter ensures each module.default access reads
// the *current* value rather than the value at factory-creation time.

let mockGamesData: unknown = VALID_GAMES;

vi.mock('@/assets/data/games.json', () => ({
  get default() { return mockGamesData; },
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('gameService', () => {
  beforeEach(() => {
    // Reset module-level cache so every test starts fresh.
    _clearGameCache();
    // Restore VALID_GAMES as the default mock payload.
    mockGamesData = VALID_GAMES;
    // Reset the JSON loader to the default (uses the vi.mock-intercepted import).
    _setGameJsonLoader(() => import('@/assets/data/games.json'));
    // Clean up any spies created within individual tests.
    vi.restoreAllMocks();
  });

  describe('loadGames()', () => {
    it('returns games and null error on valid data', async () => {
      const result = await loadGames();

      expect(result.error).toBeNull();
      expect(result.games).toHaveLength(2);
      expect(result.games[0].gameId).toBe('game-001');
    });

    it('returns EMPTY_DATA when JSON array is empty', async () => {
      mockGamesData = [];

      const result = await loadGames();

      expect(result.error).toBe('EMPTY_DATA');
      expect(result.games).toHaveLength(0);
    });

    it('returns PARSE_ERROR when JSON is not an array (plain object)', async () => {
      mockGamesData = { gameId: 'not-an-array' };

      const result = await loadGames();

      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    it('returns PARSE_ERROR when JSON is null', async () => {
      mockGamesData = null;

      const result = await loadGames();

      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    it('returns PARSE_ERROR when JSON is a primitive string', async () => {
      mockGamesData = 'invalid-json-string';

      const result = await loadGames();

      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    it('returns PARSE_ERROR when array elements lack required fields', async () => {
      // Missing gameId, homeTeamId, awayTeamId, startTimeUtc, venue
      mockGamesData = [{ date: '2026-06-15' }];

      const result = await loadGames();

      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    it('returns PARSE_ERROR when array elements have wrong field types', async () => {
      // All required keys present but wrong types (numbers instead of strings)
      mockGamesData = [{
        gameId:         12345,
        date:           '2026-06-15',
        homeTeamId:     147,
        awayTeamId:     111,
        startTimeUtc:   '2026-06-15T23:05:00Z',
        venue:          'Yankee Stadium',
      }];

      const result = await loadGames();

      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    // ── SyntaxError / FETCH_FAILED boundary ──────────────────────────────────

    it('returns PARSE_ERROR when import throws SyntaxError', async () => {
      _setGameJsonLoader(() => Promise.reject(new SyntaxError('Malformed JSON')));
      const result = await loadGames();
      expect(result.error).toBe('PARSE_ERROR');
      expect(result.games).toHaveLength(0);
    });

    it('returns FETCH_FAILED when import throws a non-SyntaxError', async () => {
      _setGameJsonLoader(() => Promise.reject(new TypeError('Failed to fetch')));
      const result = await loadGames();
      expect(result.error).toBe('FETCH_FAILED');
      expect(result.games).toHaveLength(0);
    });

    // ── Caching behaviour ─────────────────────────────────────────────────────

    it('caches results: second loadGames() call returns same data without re-importing', async () => {
      // First call populates the cache.
      const result1 = await loadGames();
      expect(result1.error).toBeNull();
      expect(result1.games).toHaveLength(2);

      // Swap mock data — the cached result should be returned, not the new data.
      mockGamesData = [];

      const result2 = await loadGames();

      expect(result2.error).toBeNull();
      expect(result2.games).toHaveLength(2);
      expect(result2.games).toBe(result1.games); // Exact same reference from cache.
    });

    it('_clearGameCache() allows re-importing fresh data on next call', async () => {
      // Warm up the cache.
      const result1 = await loadGames();
      expect(result1.games).toHaveLength(2);

      // Clear cache and change mock payload.
      _clearGameCache();
      mockGamesData = [makeGame({ gameId: 'fresh-game' })];

      const result2 = await loadGames();

      expect(result2.error).toBeNull();
      expect(result2.games).toHaveLength(1);
      expect(result2.games[0].gameId).toBe('fresh-game');
    });

    it('successive _clearGameCache() calls are idempotent', async () => {
      await loadGames();
      _clearGameCache();
      _clearGameCache(); // Should not throw or produce incorrect state.

      const result = await loadGames();
      expect(result.error).toBeNull();
      expect(result.games).toHaveLength(2);
    });

    // ── Shape validation ──────────────────────────────────────────────────────

    it('returns games with the correct Game interface shape', async () => {
      const result = await loadGames();

      const game = result.games[0];
      expect(game).toHaveProperty('gameId');
      expect(game).toHaveProperty('date');
      expect(game).toHaveProperty('dayOfWeek');
      expect(game).toHaveProperty('homeTeamId');
      expect(game).toHaveProperty('awayTeamId');
      expect(game).toHaveProperty('startTimeLocal');
      expect(game).toHaveProperty('startTimeUtc');
      expect(game).toHaveProperty('venue');
    });

    it('all returned Game fields are of the correct primitive types', async () => {
      const result = await loadGames();

      const game = result.games[0];
      expect(typeof game.gameId).toBe('string');
      expect(typeof game.date).toBe('string');
      expect(typeof game.dayOfWeek).toBe('string');
      expect(typeof game.homeTeamId).toBe('string');
      expect(typeof game.awayTeamId).toBe('string');
      expect(typeof game.startTimeLocal).toBe('string');
      expect(typeof game.startTimeUtc).toBe('string');
      expect(typeof game.venue).toBe('string');
    });

    it('preserves all games from the source array', async () => {
      const result = await loadGames();

      const ids = result.games.map((g) => g.gameId);
      expect(ids).toContain('game-001');
      expect(ids).toContain('game-002');
    });

    it('result.games is an Array instance', async () => {
      const result = await loadGames();

      expect(Array.isArray(result.games)).toBe(true);
    });
  });
});
