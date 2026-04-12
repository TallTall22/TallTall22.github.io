// src/composables/__tests__/useStadiumMarkers.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';

import { useStadiumMarkers } from '../useStadiumMarkers';
import { useTripStore } from '@/stores/tripStore';
import {
  _setStadiumJsonLoader,
  _clearStadiumCache,
} from '@/services/stadiumService';

import type { Stadium, Trip, TripDay, GameDay } from '@/types/models';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStadium(
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<Stadium> = {},
): Stadium {
  return {
    id,
    teamId: id,
    teamName: `Team ${id}`,
    teamNickname: id,
    stadiumName: `${id} Stadium`,
    city: 'City',
    state: 'ST',
    coordinates: { lat, lng },
    timeZone: 'America/New_York',
    league: 'AL',
    division: 'ALE',
    logoUrl: `https://logo/${id}.png`,
    stadiumPhotoUrl: `https://photo/${id}.jpg`,
    ...overrides,
  };
}

function makeGameDay(dayNumber: number, date: string, stadiumId: string): GameDay {
  return {
    type: 'game_day',
    dayNumber,
    date,
    stadiumId,
    game: {
      gameId: `g${dayNumber}`,
      date,
      dayOfWeek: 'Mon',
      homeTeamId: stadiumId,
      awayTeamId: 'OPP',
      startTimeLocal: '19:05',
      startTimeUtc: '23:05',
      venue: `${stadiumId} Stadium`,
    },
  };
}

function makeTrip(itinerary: TripDay[], homeStadiumId = ''): Trip {
  return {
    tripId: 'test-trip',
    createdAt: '2026-04-01',
    startDate: itinerary[0]?.date ?? '2026-04-01',
    endDate: itinerary[itinerary.length - 1]?.date ?? '2026-04-01',
    homeStadiumId,
    itinerary,
    totalDistance: 0,
    qualityScore: 0,
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

describe('useStadiumMarkers', () => {
  beforeEach(() => {
    activePinia = createPinia();
    setActivePinia(activePinia);
    _clearStadiumCache();
    _setStadiumJsonLoader(undefined);
  });

  afterEach(() => {
    _setStadiumJsonLoader(undefined);
  });

  // ── 1: No trip, no homeStadiumId → all unscheduled ──────────────────────────

  it('marks all stadiums as unscheduled when there is no trip and no homeStadiumId', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());

    await flushPromises();

    expect(markers.value.length).toBe(2);
    expect(markers.value.every((m) => m.status === 'unscheduled')).toBe(true);
  });

  // ── 2: Trip with GameDays — correct status precedence ───────────────────────

  it('marks scheduled stadiums correctly; home takes precedence over scheduled', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);
    const chc = makeStadium('CHC', 41.9, -87.6);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos, chc] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());
    const store = useTripStore();

    // NYY = home stadium; BOS = scheduled game day; CHC = unscheduled
    // NYY is ALSO in the itinerary — home must take precedence over scheduled
    store.setHomeStadium('NYY');
    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
    ]);
    store.setSelectedTrip(trip);

    await flushPromises();

    const find = (id: string) => markers.value.find((m) => m.stadiumId === id);

    expect(find('NYY')?.status).toBe('home');       // home beats scheduled
    expect(find('BOS')?.status).toBe('scheduled');  // in itinerary
    expect(find('CHC')?.status).toBe('unscheduled'); // not in itinerary
  });

  // ── 3: loadStadiums fails → error set, markers empty, isLoading false ────────

  it('sets error and returns empty markers when loadStadiums fails', async () => {
    _setStadiumJsonLoader(async () => {
      throw new Error('Network failure');
    });

    const [{ markers, error, isLoading }] = withSetup(() => useStadiumMarkers());
    const store = useTripStore();

    store.setSelectedTrip(
      makeTrip([makeGameDay(1, '2026-04-01', 'NYY')]),
    );

    await flushPromises();

    expect(error.value).not.toBeNull();
    expect(markers.value).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  // ── 4: Invalid coordinates → filtered out ────────────────────────────────────

  it('filters out stadiums with invalid (NaN) coordinates', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bad = makeStadium('BAD', NaN, -71.0);  // invalid lat

    _setStadiumJsonLoader(async () => ({ default: [nyy, bad] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());

    await flushPromises();

    expect(markers.value.length).toBe(1);
    expect(markers.value[0].stadiumId).toBe('NYY');
    expect(markers.value.find((m) => m.stadiumId === 'BAD')).toBeUndefined();
  });

  // ── 5: Trip cleared → all markers revert to unscheduled ─────────────────────

  it('reverts all markers to unscheduled when trip is cleared', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());
    const store = useTripStore();

    // Set a trip with scheduled games first
    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
    ]);
    store.setSelectedTrip(trip);
    await flushPromises();

    // Verify scheduled state
    expect(markers.value.find((m) => m.stadiumId === 'NYY')?.status).toBe('scheduled');

    // Clear the trip
    _clearStadiumCache();
    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));
    store.setSelectedTrip(null);
    await flushPromises();

    // All should revert to unscheduled
    expect(markers.value.every((m) => m.status === 'unscheduled')).toBe(true);
  });

  // ── 6: Marker data shape is correctly mapped ─────────────────────────────────

  it('correctly maps stadium fields onto StadiumMarkerData', async () => {
    const nyy = makeStadium('NYY', 40.8296, -73.9262);

    _setStadiumJsonLoader(async () => ({ default: [nyy] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());

    await flushPromises();

    expect(markers.value.length).toBe(1);
    expect(markers.value[0]).toMatchObject({
      stadiumId:       'NYY',
      teamName:        'Team NYY',
      teamNickname:    'NYY',
      stadiumName:     'NYY Stadium',
      city:            'City',
      state:           'ST',
      lat:             40.8296,
      lng:             -73.9262,
      logoUrl:         'https://logo/NYY.png',
      stadiumPhotoUrl: 'https://photo/NYY.jpg',
      status:          'unscheduled',
    });
  });

  // ── 7: Race condition guard — rapid homeStadiumId changes ────────────────────

  it('only commits the last result on rapid homeStadiumId changes', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ markers }] = withSetup(() => useStadiumMarkers());
    const store = useTripStore();

    // Fire two rapid changes before either resolves
    store.setHomeStadium('NYY');
    store.setHomeStadium('BOS');

    await flushPromises();

    // Only the last result (BOS as home) should be committed
    expect(markers.value.find((m) => m.stadiumId === 'BOS')?.status).toBe('home');
    expect(markers.value.find((m) => m.stadiumId === 'NYY')?.status).toBe('unscheduled');
  });

  // ── 8: isLoading transitions correctly ───────────────────────────────────────

  it('sets isLoading false after successful load', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);

    _setStadiumJsonLoader(async () => ({ default: [nyy] }));

    const [{ isLoading }] = withSetup(() => useStadiumMarkers());

    await nextTick(); // after watch fires, isLoading should be true
    // (we can't reliably assert true here since it may resolve immediately in test env)

    await flushPromises();

    expect(isLoading.value).toBe(false);
  });
});
