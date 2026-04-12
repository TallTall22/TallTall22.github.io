// src/composables/__tests__/useTimeline.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';

import { useTimeline } from '../useTimeline';
import { useTripStore } from '@/stores/tripStore';
import { _setStadiumJsonLoader, _clearStadiumCache } from '@/services/stadiumService';
import type { Stadium, Trip, TripDay, GameDay, TravelDay } from '@/types/models';

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
    logoUrl:         'https://example.com/logo/nyy.svg',
    stadiumPhotoUrl: '/images/stadiums/NYY.jpg',
    ...overrides,
  };
}

function makeAwayStadium(): Stadium {
  return makeStadium({
    id:              'BOS',
    teamId:          '111',
    teamName:        'Boston Red Sox',
    teamNickname:    'Red Sox',
    logoUrl:         'https://example.com/logo/bos.svg',
    stadiumPhotoUrl: '/images/stadiums/BOS.jpg',
  });
}

function makeGameDay(overrides: Partial<GameDay> = {}): GameDay {
  return {
    type:      'game_day',
    dayNumber: 1,
    date:      '2026-04-06',
    stadiumId: 'NYY',
    game: {
      gameId:         'g001',
      date:           '2026-04-06',
      dayOfWeek:      'Monday',
      homeTeamId:     '147',
      awayTeamId:     '111',
      startTimeLocal: '7:05 PM',
      startTimeUtc:   '2026-04-06T23:05:00Z',
      venue:          'Yankee Stadium',
    },
    ...overrides,
  };
}

function makeTravelDay(overrides: Partial<TravelDay> = {}): TravelDay {
  return {
    type:                 'travel_day',
    dayNumber:            2,
    date:                 '2026-04-07',
    distanceFromPrevious: 342,
    ...overrides,
  };
}

function makeTrip(itinerary: TripDay[]): Trip {
  return {
    tripId:        'trip-001',
    createdAt:     '2026-04-01',
    startDate:     itinerary[0]?.date ?? '2026-04-06',
    endDate:       itinerary[itinerary.length - 1]?.date ?? '2026-04-07',
    homeStadiumId: 'NYY',
    itinerary,
    totalDistance: 500,
    qualityScore:  85,
  };
}

// ── withSetup helper ──────────────────────────────────────────────────────────

let activePinia: Pinia;

function withSetup<T>(composable: () => T): [T, ReturnType<typeof mount>] {
  let result!: T;
  const TestComponent = defineComponent({
    setup() {
      result = composable();
      return {};
    },
    template: '<div></div>',
  });
  const wrapper = mount(TestComponent, {
    global: { plugins: [activePinia] },
  });
  return [result, wrapper];
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('useTimeline', () => {
  beforeEach(() => {
    activePinia = createPinia();
    setActivePinia(activePinia);
    _clearStadiumCache();
    _setStadiumJsonLoader(undefined);
  });

  afterEach(() => {
    _clearStadiumCache();
    _setStadiumJsonLoader(undefined);
  });

  // ── 1: null trip ─────────────────────────────────────────────────────────────

  it('returns empty timelineDays when selectedTrip is null', async () => {
    const [{ timelineDays, isLoading }] = withSetup(() => useTimeline());

    // watch fires immediately with null trip — synchronous reset, no async needed
    await nextTick();

    expect(timelineDays.value).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  // ── 2: GameDay → matchupLabel ─────────────────────────────────────────────────

  it('maps GameDay to TimelineDayViewModel with correct matchupLabel', async () => {
    _setStadiumJsonLoader(async () => ({ default: [makeStadium(), makeAwayStadium()] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    store.setSelectedTrip(makeTrip([makeGameDay()]));
    await flushPromises();

    expect(timelineDays.value).toHaveLength(1);
    // Away @ Home: BOS (awayTeamId='111') away, NYY (homeTeamId='147') home
    expect(timelineDays.value[0]?.matchupLabel).toBe('Red Sox @ Yankees');
    expect(timelineDays.value[0]?.type).toBe('game_day');
    expect(timelineDays.value[0]?.homeTeamLogo).toBe('https://example.com/logo/nyy.svg');
    expect(timelineDays.value[0]?.awayTeamLogo).toBe('https://example.com/logo/bos.svg');
  });

  // ── 3: TravelDay → null game fields ──────────────────────────────────────────

  it('maps TravelDay to TimelineDayViewModel with null game fields', async () => {
    _setStadiumJsonLoader(async () => ({ default: [makeStadium()] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    store.setSelectedTrip(makeTrip([makeTravelDay()]));
    await flushPromises();

    expect(timelineDays.value).toHaveLength(1);
    const day = timelineDays.value[0];
    expect(day?.type).toBe('travel_day');
    expect(day?.matchupLabel).toBeNull();
    expect(day?.localTime).toBeNull();
    expect(day?.homeTeamLogo).toBe('');
    expect(day?.awayTeamLogo).toBe('');
    expect(day?.homeTeamNickname).toBeNull();
    expect(day?.awayTeamNickname).toBeNull();
  });

  // ── 4: CRITICAL — teamId vs id lookup distinction ────────────────────────────

  it('uses Stadium.teamId (not Stadium.id) for matchup resolution', async () => {
    // Stadium where id ≠ teamId — the resolver MUST use teamId for matchup
    const weirdStadium = makeStadium({
      id:           'TEAM_A',      // Stadium.id — used by GameDay.stadiumId
      teamId:       '999',         // Stadium.teamId — used by Game.homeTeamId
      teamNickname: 'Alpha Squad',
    });

    _setStadiumJsonLoader(async () => ({ default: [weirdStadium] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    // GameDay: stadiumId references Stadium.id; game.homeTeamId references Stadium.teamId
    store.setSelectedTrip(makeTrip([
      makeGameDay({
        stadiumId: 'TEAM_A',          // matches weirdStadium.id
        game: {
          gameId:         'g-weird',
          date:           '2026-04-06',
          dayOfWeek:      'Monday',
          homeTeamId:     '999',       // matches weirdStadium.teamId
          awayTeamId:     'MISSING',   // intentionally unresolvable
          startTimeLocal: '7:05 PM',
          startTimeUtc:   '2026-04-06T23:05:00Z',
          venue:          'Alpha Field',
        },
      }),
    ]));
    await flushPromises();

    expect(timelineDays.value).toHaveLength(1);
    // homeTeamId='999' must resolve via teamId map to nickname 'Alpha Squad'
    expect(timelineDays.value[0]?.homeTeamNickname).toBe('Alpha Squad');
    // awayTeamId='MISSING' has no match → falls back to 'Unknown'
    expect(timelineDays.value[0]?.awayTeamNickname).toBe('Unknown');
    expect(timelineDays.value[0]?.matchupLabel).toBe('Unknown @ Alpha Squad');
  });

  // ── 5: Unknown fallback when teamId not found ─────────────────────────────────

  it('falls back to Unknown when teamId not found in stadiums', async () => {
    _setStadiumJsonLoader(async () => ({ default: [makeStadium()] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    store.setSelectedTrip(makeTrip([
      makeGameDay({
        game: {
          gameId:         'g-unknown',
          date:           '2026-04-06',
          dayOfWeek:      'Monday',
          homeTeamId:     'INVALID_HOME',
          awayTeamId:     'INVALID_AWAY',
          startTimeLocal: '7:05 PM',
          startTimeUtc:   '2026-04-06T23:05:00Z',
          venue:          'Yankee Stadium',
        },
      }),
    ]));
    await flushPromises();

    expect(timelineDays.value[0]?.homeTeamNickname).toBe('Unknown');
    expect(timelineDays.value[0]?.awayTeamNickname).toBe('Unknown');
    expect(timelineDays.value[0]?.matchupLabel).toBe('Unknown @ Unknown');
  });

  // ── 6: stadiumService failure ─────────────────────────────────────────────────

  it('sets error and returns empty array when loadStadiums fails', async () => {
    _setStadiumJsonLoader(() => Promise.reject(new Error('Network error')));

    const [{ timelineDays, error, isLoading }] = withSetup(() => useTimeline());
    const store = useTripStore();

    store.setSelectedTrip(makeTrip([makeGameDay()]));
    await flushPromises();

    expect(error.value).not.toBeNull();
    expect(error.value).toBe('Stadium data unavailable. Please refresh.');
    expect(timelineDays.value).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  // ── 7: race condition — rapid trip changes ─────────────────────────────────────

  it('rapid trip changes only commit the last result', async () => {
    const homeStadium = makeStadium();
    const awayStadium = makeAwayStadium();

    _setStadiumJsonLoader(async () => ({ default: [homeStadium, awayStadium] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    // Trip A: 1 game day
    const tripA = makeTrip([makeGameDay({ dayNumber: 1, date: '2026-04-06' })]);

    // Trip B: 2 game days
    const tripB = makeTrip([
      makeGameDay({ dayNumber: 1, date: '2026-04-06' }),
      makeGameDay({ dayNumber: 2, date: '2026-04-07', stadiumId: 'BOS', game: {
        gameId:         'g002',
        date:           '2026-04-07',
        dayOfWeek:      'Tuesday',
        homeTeamId:     '111',
        awayTeamId:     '147',
        startTimeLocal: '1:05 PM',
        startTimeUtc:   '2026-04-07T17:05:00Z',
        venue:          'Fenway Park',
      }}),
    ]);

    // Fire both changes before either resolves — only tripB should commit
    store.setSelectedTrip(tripA);
    store.setSelectedTrip(tripB);

    await flushPromises();

    // Only tripB's result (2 days) should be committed
    expect(timelineDays.value).toHaveLength(2);
  });

  // ── 8: reset to empty when trip set to null after having a trip ───────────────

  it('resets to empty array when trip is set to null after having a trip', async () => {
    _setStadiumJsonLoader(async () => ({ default: [makeStadium(), makeAwayStadium()] }));

    const [{ timelineDays, isLoading }] = withSetup(() => useTimeline());
    const store = useTripStore();

    // Set a trip first, let it resolve
    store.setSelectedTrip(makeTrip([makeGameDay()]));
    await flushPromises();

    expect(timelineDays.value).toHaveLength(1);

    // Now clear the trip — should synchronously reset
    store.setSelectedTrip(null);
    await nextTick();

    expect(timelineDays.value).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  // ── 9: distanceKm from TripDayBase.distanceFromPrevious ──────────────────────

  it('populates distanceKm from TripDayBase.distanceFromPrevious', async () => {
    _setStadiumJsonLoader(async () => ({ default: [makeStadium()] }));

    const [{ timelineDays }] = withSetup(() => useTimeline());
    const store = useTripStore();

    store.setSelectedTrip(makeTrip([
      makeTravelDay({ distanceFromPrevious: 500 }),
    ]));
    await flushPromises();

    expect(timelineDays.value[0]?.distanceKm).toBe(500);
  });
});
