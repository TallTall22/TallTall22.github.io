// src/services/gameService.ts
import type { Game, GameLoadResult } from '@/types/models';

/**
 * Module-level cache: games.json is a static bundle asset —
 * parse once, reuse across all watcher triggers.
 * Reset to null only in tests via _clearGameCache().
 */
let _cachedGames: Game[] | null = null;

type GameJsonLoader = () => Promise<{ default: unknown }>;
let _jsonLoader: GameJsonLoader = () => import('@/assets/data/games.json');

/** Only for testing: replace the JSON loader to simulate import errors. */
export function _setGameJsonLoader(loader: GameJsonLoader): void {
  _jsonLoader = loader;
}

/**
 * Runtime shape guard for Game[].
 * Validates every element's critical fields.
 *
 * IMPORTANT: homeTeamId uses numeric MLB teamId format (e.g., "147" for NYY),
 * matching Stadium.teamId — NOT Stadium.id ("NYY").
 * F-05 must use Stadium.teamId for the game-to-stadium mapping.
 */
function isGameArray(data: unknown): data is Game[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((item) => {
    const g = item as Record<string, unknown>;
    return (
      typeof g['gameId']       === 'string' &&
      typeof g['date']         === 'string' &&
      typeof g['homeTeamId']   === 'string' &&
      typeof g['awayTeamId']   === 'string' &&
      typeof g['startTimeUtc'] === 'string' &&
      typeof g['venue']        === 'string'
    );
  });
}

/** Clears the module-level cache. Exposed for unit testing only. */
export function _clearGameCache(): void {
  _cachedGames = null;
}

export async function loadGames(): Promise<GameLoadResult> {
  if (_cachedGames !== null) {
    return { games: _cachedGames, error: null };
  }

  try {
    const module = await _jsonLoader();
    const raw: unknown = module.default;

    if (!Array.isArray(raw)) {
      return { games: [], error: 'PARSE_ERROR' };
    }
    if (raw.length === 0) {
      return { games: [], error: 'EMPTY_DATA' };
    }
    if (!isGameArray(raw)) {
      return { games: [], error: 'PARSE_ERROR' };
    }

    _cachedGames = raw;
    return { games: raw, error: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { games: [], error: 'PARSE_ERROR' };
    }
    return { games: [], error: 'FETCH_FAILED' };
  }
}
