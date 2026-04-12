// src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, ref, nextTick } from 'vue';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';
import { useTripStore } from '@/stores/tripStore';
import type { RoutingResult, Game } from '@/types/models';
import type { Ref } from 'vue';

// ── visualViewport polyfill (required by Vuetify in jsdom) ───────────────────
beforeAll(() => {
  if (!window.visualViewport) {
    Object.defineProperty(window, 'visualViewport', {
      value: { width: 1024, height: 768, addEventListener: () => {}, removeEventListener: () => {} },
      configurable: true,
    });
  }
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) },
      configurable: true,
    });
  }
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const STUB_TRIP_RESULT: RoutingResult = {
  error:              null,
  totalGamesAttended: 1,
  totalTravelDays:    0,
  trip: {
    tripId:        'test-trip-id',
    createdAt:     '2026-06-15',
    startDate:     '2026-06-15',
    endDate:       '2026-06-15',
    homeStadiumId: 'NYY',
    itinerary:     [],
    totalDistance: 0,
    qualityScore:  100,
  },
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/services/routingService', () => ({
  computeTrip: vi.fn(),
}));

import { computeTrip } from '@/services/routingService';
const mockComputeTrip = vi.mocked(computeTrip);

// ── Mount helper ──────────────────────────────────────────────────────────────

/**
 * Mounts useRoutingAlgorithm with an externally controlled filteredGames ref.
 * This avoids double-instantiating useGameFilter (P1-7) and lets tests
 * trigger the watcher directly by setting gamesRef.value.
 */
function mountWithComposable(initialGames: Game[] = []) {
  const gamesRef = ref<Game[]>(initialGames);

  const Wrapper = defineComponent({
    setup() { return useRoutingAlgorithm(gamesRef as Ref<Game[]>); },
    template: '<div />',
  });

  const wrapper = mount(Wrapper, { global: { plugins: [createPinia()] } });
  return { wrapper, gamesRef };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRoutingAlgorithm (integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockComputeTrip.mockResolvedValue(STUB_TRIP_RESULT);
  });

  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with isRouting=false, no error', () => {
      const { wrapper } = mountWithComposable();
      expect(wrapper.vm.isRouting).toBe(false);
      expect(wrapper.vm.routingError).toBeNull();
    });

    it('does NOT call computeTrip on mount (non-immediate watcher)', async () => {
      mountWithComposable();
      await flushPromises();
      expect(mockComputeTrip).not.toHaveBeenCalled();
    });
  });

  // ── guard: missing inputs ───────────────────────────────────────────────────

  describe('input guard', () => {
    it('does not route when homeStadiumId is missing', async () => {
      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-20');
      // homeStadiumId NOT set — trigger watcher directly
      gamesRef.value = [makeGame()];
      await flushPromises();

      expect(mockComputeTrip).not.toHaveBeenCalled();
      expect(wrapper.vm.isRouting).toBe(false);
    });
  });

  // ── error handling ──────────────────────────────────────────────────────────

  describe('error path', () => {
    it('sets routingError when computeTrip returns an error', async () => {
      mockComputeTrip.mockResolvedValue({
        trip: null, error: 'NO_GAMES', totalGamesAttended: 0, totalTravelDays: 0,
      });

      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');

      // Trigger the watcher
      gamesRef.value = [makeGame()];
      await flushPromises();

      // Unconditional assertions — will fail if composable is broken
      expect(mockComputeTrip).toHaveBeenCalledOnce();
      expect(wrapper.vm.routingError).toBe('NO_GAMES');
      expect(store.selectedTrip).toBeNull();
      expect(wrapper.vm.isRouting).toBe(false);
    });
  });

  // ── happy path ──────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('writes generatedTrip and store.selectedTrip on success', async () => {
      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');

      gamesRef.value = [makeGame()];
      await flushPromises();

      expect(mockComputeTrip).toHaveBeenCalledOnce();
      expect(store.selectedTrip).toStrictEqual(STUB_TRIP_RESULT.trip);
      expect(wrapper.vm.isRouting).toBe(false);
      expect(wrapper.vm.routingError).toBeNull();
    });
  });

  // ── unmount cleanup ─────────────────────────────────────────────────────────

  describe('unmount cleanup', () => {
    it('does not update state after component unmounts', async () => {
      let resolveCompute!: (v: RoutingResult) => void;
      mockComputeTrip.mockReturnValue(
        new Promise<RoutingResult>((r) => { resolveCompute = r; }),
      );

      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');
      gamesRef.value = [makeGame()];

      await nextTick();

      // Unmount before promise resolves
      wrapper.unmount();

      // Now resolve
      resolveCompute(STUB_TRIP_RESULT);
      await flushPromises();

      // isMounted guard must prevent writing to store
      expect(store.selectedTrip).toBeNull();
    });
  });

  // ── race condition ──────────────────────────────────────────────────────────

  describe('race condition guard', () => {
    it('isRouting resets to false when guard fires with missing inputs', async () => {
      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      // Set dates but no homeStadiumId
      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-20');
      gamesRef.value = [makeGame()];
      await flushPromises();

      expect(wrapper.vm.isRouting).toBe(false);
    });

    it('discards stale result when a newer request fires before the first completes', async () => {
      // Set up two mock results: stale (slow) and fresh (fast)
      let resolveStale!: (v: RoutingResult) => void;
      const stalePromise = new Promise<RoutingResult>((r) => { resolveStale = r; });

      const freshResult: RoutingResult = {
        error:              null,
        totalGamesAttended: 1,
        totalTravelDays:    0,
        trip: {
          tripId:        'fresh-trip',
          createdAt:     '2026-06-15',
          startDate:     '2026-06-15',
          endDate:       '2026-06-15',
          homeStadiumId: 'NYY',
          itinerary:     [],
          totalDistance: 0,
          qualityScore:  100,
        },
      };

      mockComputeTrip
        .mockReturnValueOnce(stalePromise)      // request 1: slow, won't resolve yet
        .mockResolvedValueOnce(freshResult);    // request 2: resolves immediately

      const { wrapper, gamesRef } = mountWithComposable();
      const store = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');

      // Trigger request 1 by setting games
      gamesRef.value = [makeGame()];
      await nextTick(); // let watcher fire, request 1 starts

      // Trigger request 2 by changing games (watcher fires again with higher requestCounter)
      gamesRef.value = [makeGame({ gameId: 'g-002' })];
      await flushPromises(); // request 2 resolves; request 1 is still pending

      // Stale request 1 resolves AFTER request 2 is done
      resolveStale(STUB_TRIP_RESULT); // STUB_TRIP_RESULT has tripId: 'test-trip-id'
      await flushPromises();

      // Only the FRESH result (from request 2) should survive — stale request 1 is discarded
      expect(store.selectedTrip?.tripId).toBe('fresh-trip');
      expect(wrapper.vm.routingError).toBeNull();
      expect(wrapper.vm.isRouting).toBe(false);
      expect(mockComputeTrip).toHaveBeenCalledTimes(2);
    });
  });
});

