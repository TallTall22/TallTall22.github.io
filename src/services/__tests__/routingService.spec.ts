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
    });
    expect(result.error).toBe('STADIUM_LOAD_FAILED');
    expect(result.trip).toBeNull();
  });

  it('returns NO_HOME_STADIUM for unknown homeStadiumId', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'UNKNOWN',
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
    });
    expect(result.error).toBe('EMPTY_ITINERARY');
    expect(result.trip).toBeNull();
  });

  it('trip.itinerary has one entry when range is one day', async () => {
    const result = await computeTrip(STUB_GAMES, {
      startDate:     '2026-06-15',
      endDate:       '2026-06-15',
      homeStadiumId: 'NYY',
    });
    expect(result.trip?.itinerary).toHaveLength(1);
  });
});
