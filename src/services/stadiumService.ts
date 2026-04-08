// src/services/stadiumService.ts
import type { Stadium, StadiumLoadResult } from '@/types/models';

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

    return { stadiums: raw as Stadium[], error: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { stadiums: [], error: 'PARSE_ERROR' };
    }
    return { stadiums: [], error: 'FETCH_FAILED' };
  }
}
