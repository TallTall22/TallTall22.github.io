// src/services/stadiumService.ts
import type { Stadium, StadiumLoadResult } from '@/types/models';

/** Minimal runtime shape guard — validates first element's critical fields. */
function isStadiumArray(data: unknown): data is Stadium[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first['id'] === 'string' &&
    typeof first['teamName'] === 'string' &&
    typeof first['stadiumName'] === 'string' &&
    typeof first['coordinates'] === 'object' &&
    first['coordinates'] !== null
  );
}

export async function loadStadiums(): Promise<StadiumLoadResult> {
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

    return { stadiums: raw, error: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { stadiums: [], error: 'PARSE_ERROR' };
    }
    return { stadiums: [], error: 'FETCH_FAILED' };
  }
}
