// src/utils/__tests__/routingAlgorithm.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import {
  haversineDistance,
  daysBetween,
  formatDateLocal,
  buildStadiumByTeamIdMap,
  buildStadiumByIdMap,
  estimateTravelMinutes,
  scoreGameCandidates,
  buildItinerary,
  assembleTripFromItinerary,
} from '@/utils/routingAlgorithm';

// MAX_REACH_KM is an internal constant (not exported); mirror the value here.
const MAX_REACH_KM = 5_000;
import type { Stadium, Game, RoutingOptions } from '@/types/models';

// ── crypto polyfill ───────────────────────────────────────────────────────────
beforeAll(() => {
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) },
      configurable: true,
    });
  }
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStadium(overrides: Partial<Stadium> = {}): Stadium {
  return {
    id:              'NYY',
    teamId:          '147',
    teamName:        'New York Yankees',
    teamNickname:    'Yankees',
    stadiumName:     'Yankee Stadium',
    city:            'New York',
    state:           'NY',
    coordinates:     { lat: 40.8296, lng: -73.9262 },
    timeZone:        'America/New_York',
    league:          'AL',
    division:        'ALE',
    logoUrl:         '/logo/147.svg',
    stadiumPhotoUrl: '/img/NYY.jpg',
    ...overrides,
  };
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId:         'g-001',
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

const NYY = makeStadium({ id: 'NYY', teamId: '147', coordinates: { lat: 40.8296, lng: -73.9262 } });
const BOS = makeStadium({ id: 'BOS', teamId: '111', coordinates: { lat: 42.3467, lng: -71.0972 } });
const LAD = makeStadium({ id: 'LAD', teamId: '119', coordinates: { lat: 34.0739, lng: -118.24 } });

// ── haversineDistance ─────────────────────────────────────────────────────────

describe('haversineDistance()', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance({ lat: 40.83, lng: -73.93 }, { lat: 40.83, lng: -73.93 })).toBeCloseTo(0, 5);
  });

  it('NY → LA ≈ 3940 km', () => {
    const d = haversineDistance({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(3980);
  });

  it('is symmetric (A→B = B→A)', () => {
    const atl = { lat: 33.8908, lng: -84.4678 };
    const hou = { lat: 29.7573, lng: -95.3554 };
    expect(haversineDistance(atl, hou)).toBeCloseTo(haversineDistance(hou, atl), 5);
  });

  it('returns positive for different points', () => {
    expect(haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).toBeGreaterThan(0);
  });

  it('NYY → BOS is ~300 km', () => {
    const d = haversineDistance(NYY.coordinates, BOS.coordinates);
    expect(d).toBeGreaterThan(280);
    expect(d).toBeLessThan(330);
  });
});

// ── daysBetween ───────────────────────────────────────────────────────────────

describe('daysBetween()', () => {
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-06-15', '2026-06-15')).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(daysBetween('2026-06-14', '2026-06-15')).toBe(1);
  });

  it('returns 7 for one week', () => {
    expect(daysBetween('2026-06-01', '2026-06-08')).toBe(7);
  });

  it('returns negative when b < a', () => {
    expect(daysBetween('2026-06-15', '2026-06-10')).toBe(-5);
  });

  it('handles month boundaries', () => {
    expect(daysBetween('2026-01-28', '2026-02-04')).toBe(7);
  });

  it('handles year boundaries', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

// ── formatDateLocal ───────────────────────────────────────────────────────────

describe('formatDateLocal()', () => {
  it('formats June 15 2026 correctly', () => {
    expect(formatDateLocal(new Date(2026, 5, 15))).toBe('2026-06-15');
  });

  it('zero-pads single-digit month and day', () => {
    expect(formatDateLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles December 31', () => {
    expect(formatDateLocal(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

// ── buildStadiumByTeamIdMap ───────────────────────────────────────────────────

describe('buildStadiumByTeamIdMap()', () => {
  it('maps teamId → stadium', () => {
    expect(buildStadiumByTeamIdMap([NYY]).get('147')).toBe(NYY);
  });

  it('correct size for multiple entries', () => {
    expect(buildStadiumByTeamIdMap([NYY, BOS]).size).toBe(2);
  });

  it('empty map for empty input', () => {
    expect(buildStadiumByTeamIdMap([]).size).toBe(0);
  });

  it('last entry wins on duplicate teamId', () => {
    const dupe = makeStadium({ teamId: '147', id: 'DUPE' });
    expect(buildStadiumByTeamIdMap([NYY, dupe]).get('147')?.id).toBe('DUPE');
  });
});

// ── buildStadiumByIdMap ───────────────────────────────────────────────────────

describe('buildStadiumByIdMap()', () => {
  it('maps Stadium.id → stadium', () => {
    expect(buildStadiumByIdMap([NYY]).get('NYY')).toBe(NYY);
  });

  it('correct size', () => {
    expect(buildStadiumByIdMap([NYY, BOS]).size).toBe(2);
  });

  it('empty map for empty input', () => {
    expect(buildStadiumByIdMap([]).size).toBe(0);
  });
});

// ── estimateTravelMinutes ─────────────────────────────────────────────────────

describe('estimateTravelMinutes()', () => {
  it('returns 0 for 0 km', () => expect(estimateTravelMinutes(0)).toBe(0));
  it('returns 0 for < 1 km', () => expect(estimateTravelMinutes(0.5)).toBe(0));
  it('drive estimate for 100 km → 60 min', () => expect(estimateTravelMinutes(100)).toBe(60));
  it('flight estimate for 800 km → 180 min', () => expect(estimateTravelMinutes(800)).toBe(180));
  it('longer distance → more time', () => {
    expect(estimateTravelMinutes(4000)).toBeGreaterThan(estimateTravelMinutes(1000));
  });
});

// ── scoreGameCandidates ───────────────────────────────────────────────────────

describe('scoreGameCandidates()', () => {
  it('returns [] for empty games', () => {
    expect(scoreGameCandidates([], NYY, buildStadiumByTeamIdMap([NYY]))).toHaveLength(0);
  });

  it('drops game with unknown homeTeamId', () => {
    const g = makeGame({ homeTeamId: '999' });
    expect(scoreGameCandidates([g], NYY, buildStadiumByTeamIdMap([NYY]))).toHaveLength(0);
  });

  it('same-stadium game scores ≈ MAX_REACH_KM', () => {
    const g   = makeGame({ homeTeamId: '147' });
    const map = buildStadiumByTeamIdMap([NYY]);
    const [c] = scoreGameCandidates([g], NYY, map);
    expect(c!.score).toBeCloseTo(MAX_REACH_KM, 0);
    expect(c!.distanceKm).toBeCloseTo(0, 1);
  });

  it('closer stadium gets higher score', () => {
    const games = [makeGame({ homeTeamId: '111' }), makeGame({ homeTeamId: '119' })];
    const map   = buildStadiumByTeamIdMap([NYY, BOS, LAD]);
    const cs    = scoreGameCandidates(games, NYY, map);
    const bosC  = cs.find((c) => c.stadium.id === 'BOS')!;
    const ladC  = cs.find((c) => c.stadium.id === 'LAD')!;
    expect(bosC.score).toBeGreaterThan(ladC.score);
  });

  it('distanceKm for NYY→BOS is ~300 km', () => {
    const g   = makeGame({ homeTeamId: '111' });
    const map = buildStadiumByTeamIdMap([NYY, BOS]);
    const [c] = scoreGameCandidates([g], NYY, map);
    expect(c!.distanceKm).toBeGreaterThan(280);
    expect(c!.distanceKm).toBeLessThan(330);
  });
});

// ── buildItinerary ────────────────────────────────────────────────────────────

describe('buildItinerary()', () => {
  const map3 = buildStadiumByTeamIdMap([NYY, BOS, LAD]);

  it('all TravelDays when no games', () => {
    const r = buildItinerary([], NYY, map3, '2026-06-01', '2026-06-03');
    expect(r).toHaveLength(3);
    expect(r.every((d) => d.type === 'travel_day')).toBe(true);
  });

  it('single GameDay when one game on one day', () => {
    const g = makeGame({ date: '2026-06-01', homeTeamId: '147' });
    const r = buildItinerary([g], NYY, map3, '2026-06-01', '2026-06-01');
    expect(r).toHaveLength(1);
    expect(r[0]!.type).toBe('game_day');
  });

  it('TravelDays before the game day', () => {
    const g = makeGame({ date: '2026-06-03', homeTeamId: '147' });
    const r = buildItinerary([g], NYY, map3, '2026-06-01', '2026-06-03');
    expect(r).toHaveLength(3);
    expect(r[0]!.type).toBe('travel_day');
    expect(r[1]!.type).toBe('travel_day');
    expect(r[2]!.type).toBe('game_day');
  });

  it('sequential dayNumbers from 1', () => {
    const r = buildItinerary([], NYY, map3, '2026-06-01', '2026-06-05');
    expect(r.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it('greedy picks closest stadium on tie-day', () => {
    const games = [
      makeGame({ gameId: 'near', date: '2026-06-01', homeTeamId: '147' }), // NYY = 0km
      makeGame({ gameId: 'far',  date: '2026-06-01', homeTeamId: '119' }), // LAD = far
    ];
    const r = buildItinerary(games, NYY, buildStadiumByTeamIdMap([NYY, LAD]), '2026-06-01', '2026-06-01');
    expect(r[0]!.type).toBe('game_day');       // hard assertion — fails if wrong type
    if (r[0]!.type === 'game_day') {           // TypeScript narrowing
      expect(r[0]!.stadiumId).toBe('NYY');
    }
  });

  it('treats days with only unknown-teamId games as TravelDay', () => {
    const g = makeGame({ date: '2026-06-01', homeTeamId: '999' });
    const r = buildItinerary([g], NYY, map3, '2026-06-01', '2026-06-01');
    expect(r[0]!.type).toBe('travel_day');
  });

  it('distanceFromPrevious=0 for same-stadium GameDay', () => {
    const g = makeGame({ date: '2026-06-01', homeTeamId: '147' });
    const r = buildItinerary([g], NYY, map3, '2026-06-01', '2026-06-01');
    expect(r[0]!.type).toBe('game_day');
    if (r[0]!.type === 'game_day') {
      expect(r[0]!.distanceFromPrevious).toBe(0);
    }
  });

  it('positive distanceFromPrevious when changing stadiums', () => {
    const g = makeGame({ date: '2026-06-01', homeTeamId: '111' }); // BOS
    const r = buildItinerary([g], NYY, buildStadiumByTeamIdMap([NYY, BOS]), '2026-06-01', '2026-06-01');
    expect(r[0]!.type).toBe('game_day');
    if (r[0]!.type === 'game_day') {
      expect(r[0]!.distanceFromPrevious).toBeGreaterThan(0);
    }
  });
});

// ── assembleTripFromItinerary ─────────────────────────────────────────────────

describe('assembleTripFromItinerary()', () => {
  const opts: RoutingOptions = { startDate: '2026-06-01', endDate: '2026-06-03', homeStadiumId: 'NYY' };

  it('sets correct start/end/homeStadiumId', () => {
    const trip = assembleTripFromItinerary([], opts);
    expect(trip.startDate).toBe('2026-06-01');
    expect(trip.endDate).toBe('2026-06-03');
    expect(trip.homeStadiumId).toBe('NYY');
  });

  it('qualityScore=0 for empty itinerary', () => {
    const trip = assembleTripFromItinerary([], opts);
    expect(trip.qualityScore).toBe(0);
    expect(trip.totalDistance).toBe(0);
  });

  it('qualityScore=100 when all days are GameDays', () => {
    const g    = makeGame({ date: '2026-06-01', homeTeamId: '147' });
    const iter = buildItinerary([g], NYY, buildStadiumByTeamIdMap([NYY]), '2026-06-01', '2026-06-01');
    expect(assembleTripFromItinerary(iter, opts).qualityScore).toBe(100);
  });

  it('qualityScore=33 for 1 game in 3 days', () => {
    const g    = makeGame({ date: '2026-06-03', homeTeamId: '147' });
    const iter = buildItinerary([g], NYY, buildStadiumByTeamIdMap([NYY]), '2026-06-01', '2026-06-03');
    expect(assembleTripFromItinerary(iter, opts).qualityScore).toBe(33);
  });

  it('produces a non-empty tripId', () => {
    const trip = assembleTripFromItinerary([], opts);
    expect(typeof trip.tripId).toBe('string');
    expect(trip.tripId.length).toBeGreaterThan(0);
  });

  it('totalDistance sums distanceFromPrevious', () => {
    const g    = makeGame({ date: '2026-06-01', homeTeamId: '111' }); // BOS
    const iter = buildItinerary([g], NYY, buildStadiumByTeamIdMap([NYY, BOS]), '2026-06-01', '2026-06-01');
    expect(assembleTripFromItinerary(iter, opts).totalDistance).toBeGreaterThan(0);
  });
});
