// src/services/__tests__/routingService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeTrip } from '@/services/routingService';
import type { Game, Stadium } from '@/types/models';

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

const STUB_STADIUMS: Stadium[] = [makeStadium()];
const STUB_GAMES: Game[]       = [makeGame({ date: '2026-06-15', homeTeamId: '147' })];

// ── Mock stadiumService ───────────────────────────────────────────────────────

vi.mock('@/services/stadiumService', () => ({
  loadStadiums: vi.fn(),
}));

import { loadStadiums } from '@/services/stadiumService';
const mockLoadStadiums = vi.mocked(loadStadiums);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeTrip()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLoadStadiums.mockResolvedValue({ stadiums: STUB_STADIUMS, error: null });
  });

  it('returns a trip with error=null on happy path', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.error).toBeNull();
    expect(result.trip).not.toBeNull();
    expect(result.totalGamesAttended).toBe(1);
    expect(result.totalTravelDays).toBe(0);
  });

  it('does not call loadStadiums when filteredGames is empty', async () => {
    const result = await computeTrip([], {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.error).toBe('NO_GAMES');
    expect(result.trip).toBeNull();
    expect(mockLoadStadiums).not.toHaveBeenCalled();
  });

  it('returns STADIUM_LOAD_FAILED when loadStadiums errors', async () => {
    mockLoadStadiums.mockResolvedValue({ stadiums: [], error: 'FETCH_FAILED' });
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.error).toBe('STADIUM_LOAD_FAILED');
    expect(result.trip).toBeNull();
  });

  it('returns NO_HOME_STADIUM for unknown homeStadiumId', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'UNKNOWN',
      routingMode:   'tourism',
    });
    expect(result.error).toBe('NO_HOME_STADIUM');
    expect(result.trip).toBeNull();
  });

  it('counts travel days correctly (2 travel + 1 game)', async () => {
    const games = [makeGame({ date: '2026-06-17', homeTeamId: '147' })];
    const result = await computeTrip(games, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-17',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.error).toBeNull();
    expect(result.totalGamesAttended).toBe(1);
    expect(result.totalTravelDays).toBe(2);
  });

  it('trip contains correct homeStadiumId and dates', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.trip?.homeStadiumId).toBe('NYY');
    expect(result.trip?.startDate).toBe('2026-06-15');
    expect(result.trip?.endDate).toBe('2026-06-15');
  });

  it('returns EMPTY_ITINERARY when startDate is after endDate', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-20',
      endDate:       '2026-06-15', // end before start → empty loop
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.error).toBe('EMPTY_ITINERARY');
    expect(result.trip).toBeNull();
  });

  it('trip.itinerary has one entry when range is one day', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
      routingMode:   'tourism',
    });
    expect(result.trip?.itinerary).toHaveLength(1);
  });

  it('regional mode: game > 800 km from homeStadium returns error=NO_GAMES', async () => {
    // LAD is in Los Angeles (lat≈34, lng≈-118); NYY is in New York (~3940 km away).
    // In regional mode, NYY exceeds the 800 km radius → no game attended → NO_GAMES.
    const ladStadium = makeStadium({
      id:          'LAD',
      teamId:      '119',
      teamName:    'Los Angeles Dodgers',
      teamNickname:'Dodgers',
      stadiumName: 'Dodger Stadium',
      city:        'Los Angeles',
      state:       'CA',
      coordinates: { lat: 34.0739, lng: -118.24 },
      timeZone:    'America/Los_Angeles',
      league:      'NL',
      division:    'NLW',
      logoUrl:     '/logo/119.svg',
      stadiumPhotoUrl: '/img/LAD.jpg',
    });
    // NYY game is the only game; it is far from LAD
    const farGame = makeGame({ date: '2026-06-15', homeTeamId: '147' }); // NYY (~3940 km from LAD)
    mockLoadStadiums.mockResolvedValue({ stadiums: [ladStadium, makeStadium()], error: null });

    const result = await computeTrip([farGame], {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'LAD',
      routingMode:   'regional',
    });
    // NYY is outside 800 km of LAD → filtered out → 0 games attended → NO_GAMES
    expect(result.error).toBe('NO_GAMES');
    expect(result.trip).toBeNull();
  });
});
