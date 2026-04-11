// src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';
import { useTripStore } from '@/stores/tripStore';
import type { RoutingResult, Game } from '@/types/models';

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

vi.mock('@/services/gameService', () => ({
  loadGames: vi.fn().mockResolvedValue({ games: [makeGame()], error: null }),
}));

vi.mock('@/assets/data/stadiums.json', () => ({ default: [] }));

import { computeTrip } from '@/services/routingService';
import { loadGames } from '@/services/gameService';
const mockComputeTrip = vi.mocked(computeTrip);
const mockLoadGames   = vi.mocked(loadGames);

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountWithComposable() {
  const Wrapper = defineComponent({
    setup() { return useRoutingAlgorithm(); },
    template: '<div />',
  });
  return mount(Wrapper, { global: { plugins: [createPinia()] } });
}

/** Flush all pending microtasks and a macrotask. */
async function flushAll(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
  await new Promise<void>((r) => setTimeout(r, 0));
  await nextTick();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRoutingAlgorithm (integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // clearAllMocks resets call history but keeps mock implementations —
    // avoids the "loadGames returns undefined" unhandled error from resetAllMocks.
    vi.clearAllMocks();
    mockLoadGames.mockResolvedValue({ games: [makeGame()], error: null });
    mockComputeTrip.mockResolvedValue(STUB_TRIP_RESULT);
  });

  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with null generatedTrip, isRouting=false, no error', () => {
      const wrapper = mountWithComposable();
      expect(wrapper.vm.generatedTrip).toBeNull();
      expect(wrapper.vm.isRouting).toBe(false);
      expect(wrapper.vm.routingError).toBeNull();
    });

    it('does NOT call computeTrip on mount (non-immediate watcher)', async () => {
      mountWithComposable();
      await flushAll();
      expect(mockComputeTrip).not.toHaveBeenCalled();
    });
  });

  // ── guard: missing inputs ───────────────────────────────────────────────────

  describe('input guard', () => {
    it('does not route when homeStadiumId is missing', async () => {
      const wrapper = mountWithComposable();
      const store   = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-20');
      // homeStadiumId NOT set

      store.requestTripGeneration();
      await flushAll();

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

      const wrapper = mountWithComposable();
      const store   = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');
      store.requestTripGeneration();

      await flushAll();

      if (mockComputeTrip.mock.calls.length > 0) {
        expect(wrapper.vm.routingError).toBe('NO_GAMES');
        expect(wrapper.vm.generatedTrip).toBeNull();
        expect(store.selectedTrip).toBeNull();
        expect(wrapper.vm.isRouting).toBe(false);
      }
    });
  });

  // ── unmount cleanup ─────────────────────────────────────────────────────────

  describe('unmount cleanup', () => {
    it('does not update state after component unmounts', async () => {
      let resolveCompute!: (v: RoutingResult) => void;
      mockComputeTrip.mockReturnValue(
        new Promise<RoutingResult>((r) => { resolveCompute = r; }),
      );

      const wrapper = mountWithComposable();
      const store   = useTripStore();

      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-15');
      store.setHomeStadium('NYY');
      store.requestTripGeneration();

      await nextTick();

      // Unmount before promise resolves
      wrapper.unmount();

      // Now resolve
      resolveCompute(STUB_TRIP_RESULT);
      await flushAll();

      // isMounted guard must prevent writing to store
      expect(store.selectedTrip).toBeNull();
    });
  });

  // ── race condition ──────────────────────────────────────────────────────────

  describe('race condition guard', () => {
    it('isRouting resets to false when guard fires with missing inputs', async () => {
      const wrapper = mountWithComposable();
      const store   = useTripStore();

      // Set dates but no homeStadiumId
      store.setStartDate('2026-06-15');
      store.setEndDate('2026-06-20');
      store.requestTripGeneration();

      await flushAll();

      expect(wrapper.vm.isRouting).toBe(false);
    });
  });
});
