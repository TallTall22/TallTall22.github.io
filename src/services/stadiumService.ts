// src/services/stadiumService.ts
import type { Stadium, StadiumLoadResult } from '@/types/models';

/**
 * Module-level cache — stadiums.json is a static bundle asset.
 * Parse and validate once; reuse across all callers (useStadiumSelector,
 * useQuickStartPresets, routingService.computeTrip).
 */
let _cachedStadiums: Stadium[] | null = null;

/** Clears the module-level cache. Exposed for unit testing only. */
export function _clearStadiumCache(): void {
  _cachedStadiums = null;
}

/**
 * Runtime shape guard — validates every element's critical fields including
 * coordinates.lat / coordinates.lng as numbers to prevent silent NaN in Haversine.
 */
function isStadiumArray(data: unknown): data is Stadium[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((item) => {
    const s = item as Record<string, unknown>;
    if (
      typeof s['id']          !== 'string' ||
      typeof s['teamName']    !== 'string' ||
      typeof s['stadiumName'] !== 'string'
    ) return false;
    const coords = s['coordinates'] as Record<string, unknown> | undefined;
    return (
      coords !== null &&
      typeof coords === 'object' &&
      typeof coords['lat'] === 'number' &&
      typeof coords['lng'] === 'number'
    );
  });
}

export async function loadStadiums(): Promise<StadiumLoadResult> {
  if (_cachedStadiums !== null) {
    return { stadiums: _cachedStadiums, error: null };
  }

  try {
    const module = await import('@/assets/data/stadiums.json');
    const raw: unknown = module.default;

    if (!Array.isArray(raw)) {
      return { stadiums: [], error: 'PARSE_ERROR' };
    }

    if (raw.length === 0) {
      return { stadiums: [], error: 'EMPTY_DATA' };
    }

    if (!isStadiumArray(raw)) {
      return { stadiums: [], error: 'PARSE_ERROR' };
    }

    _cachedStadiums = raw;
    return { stadiums: raw, error: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { stadiums: [], error: 'PARSE_ERROR' };
    }
    return { stadiums: [], error: 'FETCH_FAILED' };
  }
}
