// src/composables/__tests__/useMapPolylines.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';

import { useMapPolylines } from '../useMapPolylines';
import { useTripStore } from '@/stores/tripStore';
import {
  _setStadiumJsonLoader,
  _clearStadiumCache,
} from '@/services/stadiumService';

import type { Stadium, Trip, TripDay, GameDay, TravelDay } from '@/types/models';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStadium(id: string, lat: number, lng: number): Stadium {
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
    logoUrl: '',
    stadiumPhotoUrl: '',
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

function makeTravelDay(dayNumber: number, date: string, stadiumId?: string): TravelDay {
  return { type: 'travel_day', dayNumber, date, stadiumId };
}

function makeTrip(itinerary: TripDay[]): Trip {
  return {
    tripId: 'test-trip',
    createdAt: '2026-04-01',
    startDate: itinerary[0]?.date ?? '2026-04-01',
    endDate: itinerary[itinerary.length - 1]?.date ?? '2026-04-01',
    homeStadiumId:
      itinerary[0]?.type === 'game_day' ? itinerary[0].stadiumId : '',
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

describe('useMapPolylines', () => {
  beforeEach(() => {
    activePinia = createPinia();
    setActivePinia(activePinia);
    _clearStadiumCache();
    _setStadiumJsonLoader(undefined); // restore default (safe no-op; will be overridden per-test)
  });

  afterEach(() => {
    _setStadiumJsonLoader(undefined);
  });

  // ── 1: null trip ────────────────────────────────────────────────────────────

  it('returns empty segments when selectedTrip is null', async () => {
    const [{ segments }] = withSetup(() => useMapPolylines());

    // watch fires immediately with null trip — buildSegments early-returns synchronously
    await nextTick();

    expect(segments.value).toEqual([]);
  });

  // ── 2: 3-day trip ───────────────────────────────────────────────────────────

  it('generates correct segments for 3-day trip', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);
    const chc = makeStadium('CHC', 41.9, -87.6);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos, chc] }));

    const [{ segments }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
      makeGameDay(3, '2026-04-03', 'CHC'),
    ]);

    store.setSelectedTrip(trip);
    await flushPromises();

    expect(segments.value.length).toBe(2);
    expect(segments.value[0]).toMatchObject({
      from: { lat: 40.8, lng: -73.9 },
      to: { lat: 42.3, lng: -71.0 },
      segmentType: 'game_day',
      dayIndex: 0,
    });
    expect(segments.value[1]).toMatchObject({
      segmentType: 'game_day',
      dayIndex: 1,
    });
  });

  // ── 3: TravelDay with no stadiumId ──────────────────────────────────────────

  it('skips TravelDay with no stadiumId', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ segments }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    // TravelDay in the middle with no stadiumId breaks both adjacent pairs
    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeTravelDay(2, '2026-04-02'),       // no stadiumId
      makeGameDay(3, '2026-04-03', 'BOS'),
    ]);

    store.setSelectedTrip(trip);
    await flushPromises();

    expect(segments.value).toEqual([]);
  });

  // ── 4: same-stadium consecutive days ────────────────────────────────────────

  it('skips same-stadium consecutive days', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ segments }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'NYY'), // same stadium → skip this pair
      makeGameDay(3, '2026-04-03', 'BOS'),
    ]);

    store.setSelectedTrip(trip);
    await flushPromises();

    // NYY→NYY skipped; NYY→BOS kept
    expect(segments.value.length).toBe(1);
    expect(segments.value[0]).toMatchObject({
      from: { lat: 40.8, lng: -73.9 },
      to: { lat: 42.3, lng: -71.0 },
      dayIndex: 1,
    });
  });

  // ── 5: travel_day segmentType ───────────────────────────────────────────────

  it('uses travel_day segmentType for TravelDay-to-GameDay segment', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);

    _setStadiumJsonLoader(async () => ({ default: [nyy, bos] }));

    const [{ segments }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    const trip = makeTrip([
      makeTravelDay(1, '2026-04-01', 'NYY'), // fromDay.type = 'travel_day'
      makeGameDay(2, '2026-04-02', 'BOS'),
    ]);

    store.setSelectedTrip(trip);
    await flushPromises();

    expect(segments.value.length).toBe(1);
    expect(segments.value[0].segmentType).toBe('travel_day');
  });

  // ── 6: stadiumService failure ────────────────────────────────────────────────

  it('sets error and returns empty segments when stadiumService fails', async () => {
    _setStadiumJsonLoader(async () => {
      throw new Error('Network failure');
    });

    const [{ segments, error }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    const trip = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
    ]);

    store.setSelectedTrip(trip);
    await flushPromises();

    expect(error.value).not.toBeNull();
    expect(segments.value).toEqual([]);
  });

  // ── 7: rapid trip changes — race condition guard ─────────────────────────────

  it('rapid trip changes only commit the last result', async () => {
    const nyy = makeStadium('NYY', 40.8, -73.9);
    const bos = makeStadium('BOS', 42.3, -71.0);
    const chc = makeStadium('CHC', 41.9, -87.6);

    // Immediately-resolving async loader (same pattern as other tests)
    _setStadiumJsonLoader(async () => ({ default: [nyy, bos, chc] }));

    const [{ segments }] = withSetup(() => useMapPolylines());
    const store = useTripStore();

    // First trip: NYY → BOS (2 days → 1 segment)
    const tripA = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
    ]);

    // Second trip: NYY → BOS → CHC (3 days → 2 segments)
    const tripB = makeTrip([
      makeGameDay(1, '2026-04-01', 'NYY'),
      makeGameDay(2, '2026-04-02', 'BOS'),
      makeGameDay(3, '2026-04-03', 'CHC'),
    ]);

    // Fire both changes before either resolves
    store.setSelectedTrip(tripA);
    store.setSelectedTrip(tripB);

    await flushPromises();

    // Only tripB result should be committed (requestCounter guard)
    expect(segments.value.length).toBe(2);
  });
});
