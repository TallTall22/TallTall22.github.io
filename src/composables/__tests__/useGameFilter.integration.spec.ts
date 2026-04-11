// src/composables/__tests__/useGameFilter.integration.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { useGameFilter } from '../useGameFilter';
import { useTripStore } from '@/stores/tripStore';
import * as gameService from '@/services/gameService';
import type { Game, GameLoadResult } from '@/types/models';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    gameId:         'test-game-001',
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

const STUB_GAMES: Game[] = [
  makeGame({ gameId: 'g1', date: '2026-06-01' }),
  makeGame({ gameId: 'g2', date: '2026-06-15' }),
  makeGame({ gameId: 'g3', date: '2026-06-30' }),
];

// ── Mount helper ──────────────────────────────────────────────────────────────
//
// Passes a fresh createPinia() as a plugin; when Vue mounts it, pinia's
// app.use() calls setActivePinia() internally, so any useTripStore() call
// made AFTER mountWithComposable() shares the same Pinia instance as the
// composable running inside the component.

function mountWithComposable() {
  const Wrapper = defineComponent({
    setup() { return useGameFilter(); },
    template: '<div />',
  });
  return mount(Wrapper, { global: { plugins: [createPinia()] } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGameFilter (reactive composable)', () => {
  beforeEach(() => {
    // Pre-set an active pinia as a fallback; mountWithComposable will
    // override it with its own instance once the plugin is installed.
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty filteredGames, no error, not loading', () => {
      const wrapper = mountWithComposable();
      expect(wrapper.vm.filteredGames).toHaveLength(0);
      expect(wrapper.vm.loadError).toBeNull();
      expect(wrapper.vm.isLoading).toBe(false);
      expect(wrapper.vm.filterResult).toBeNull();
    });

    it('does NOT trigger runFilter when tripGenerationRequestId = 0 (non-immediate watcher)', async () => {
      const spy = vi.spyOn(gameService, 'loadGames').mockResolvedValue({
        games: STUB_GAMES,
        error: null,
      });
      mountWithComposable();
      await nextTick();
      await nextTick();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── normal trigger ──────────────────────────────────────────────────────────

  describe('normal trigger', () => {
    it('updates filteredGames after requestTripGeneration()', async () => {
      vi.spyOn(gameService, 'loadGames').mockResolvedValue({
        games: STUB_GAMES,
        error: null,
      });
      const wrapper = mountWithComposable();
      // useTripStore() uses the pinia installed by the plugin above
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');
      store.requestTripGeneration();

      await nextTick(); // watcher fires → runFilter starts
      await nextTick(); // loadGames promise resolves
      await nextTick(); // reactive refs propagate to template

      expect(wrapper.vm.filteredGames).toHaveLength(3);
      expect(wrapper.vm.isLoading).toBe(false);
      expect(wrapper.vm.loadError).toBeNull();
    });

    it('sets filterResult with correct counts', async () => {
      vi.spyOn(gameService, 'loadGames').mockResolvedValue({
        games: STUB_GAMES,
        error: null,
      });
      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');
      store.requestTripGeneration();

      await nextTick();
      await nextTick();
      await nextTick();

      expect(wrapper.vm.filterResult).not.toBeNull();
      // rawCount = total games returned by loadGames before any filtering
      expect(wrapper.vm.filterResult?.rawCount).toBe(3);
      // filteredCount = games that survived dateRange filter (after homeOnly)
      expect(wrapper.vm.filterResult?.filteredCount).toBe(3);
      expect(wrapper.vm.filterResult?.duplicatesRemoved).toBe(0);
    });
  });

  // ── error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('sets loadError = FETCH_FAILED and filteredGames = [] on load failure', async () => {
      vi.spyOn(gameService, 'loadGames').mockResolvedValue({
        games: [],
        error: 'FETCH_FAILED',
      });
      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');
      store.requestTripGeneration();

      await nextTick();
      await nextTick();
      await nextTick();

      expect(wrapper.vm.loadError).toBe('FETCH_FAILED');
      expect(wrapper.vm.filteredGames).toHaveLength(0);
      expect(wrapper.vm.filterResult).toBeNull();
      expect(wrapper.vm.isLoading).toBe(false);
    });

    it('sets loadError = EMPTY_DATA on empty data', async () => {
      vi.spyOn(gameService, 'loadGames').mockResolvedValue({
        games: [],
        error: 'EMPTY_DATA',
      });
      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');
      store.requestTripGeneration();

      await nextTick();
      await nextTick();
      await nextTick();

      expect(wrapper.vm.loadError).toBe('EMPTY_DATA');
      expect(wrapper.vm.filteredGames).toHaveLength(0);
      expect(wrapper.vm.isLoading).toBe(false);
    });
  });

  // ── missing store dates guard ───────────────────────────────────────────────

  describe('missing store dates guard', () => {
    it('does NOT call loadGames when startDate is null', async () => {
      const spy = vi.spyOn(gameService, 'loadGames');
      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setEndDate('2026-06-30'); // startDate intentionally omitted
      store.requestTripGeneration();

      await nextTick();
      await nextTick();
      await nextTick();

      expect(spy).not.toHaveBeenCalled();
      expect(wrapper.vm.filteredGames).toHaveLength(0);
    });

    it('does NOT call loadGames when endDate is null', async () => {
      const spy = vi.spyOn(gameService, 'loadGames');
      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01'); // endDate intentionally omitted
      store.requestTripGeneration();

      await nextTick();
      await nextTick();
      await nextTick();

      expect(spy).not.toHaveBeenCalled();
      expect(wrapper.vm.filteredGames).toHaveLength(0);
    });
  });

  // ── unmount cleanup ─────────────────────────────────────────────────────────

  describe('unmount cleanup', () => {
    it('does not update refs after component is unmounted', async () => {
      // Use the same type pattern as useStadiumSelector.test.ts (line 112-115)
      let resolveGames!: (value: GameLoadResult) => void;
      const pendingPromise = new Promise<GameLoadResult>(
        (resolve) => { resolveGames = resolve; },
      );
      vi.spyOn(gameService, 'loadGames').mockReturnValue(pendingPromise);

      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');
      store.requestTripGeneration();

      await nextTick(); // watcher fires → runFilter starts, awaits loadGames

      // Unmount BEFORE the pending promise resolves → isMounted = false
      wrapper.unmount();

      // Now resolve: runFilter should detect !isMounted and bail out
      resolveGames({ games: STUB_GAMES, error: null });
      await nextTick();
      await nextTick();

      // filteredGames must still be empty — the unmount guard prevented the write
      expect(wrapper.vm.filteredGames).toHaveLength(0);
      expect(wrapper.vm.filterResult).toBeNull();
    });
  });

  // ── race condition guard ────────────────────────────────────────────────────

  describe('race condition guard', () => {
    it('discards stale result when a newer request supersedes it', async () => {
      const freshGames = [makeGame({ gameId: 'fresh-001' })];

      let resolveStale!: (value: GameLoadResult) => void;
      const stalePromise = new Promise<GameLoadResult>(
        (resolve) => { resolveStale = resolve; },
      );

      vi.spyOn(gameService, 'loadGames')
        .mockReturnValueOnce(stalePromise)
        .mockResolvedValueOnce({ games: freshGames, error: null });

      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');

      // Request 1: starts, awaits stalePromise
      store.requestTripGeneration();
      await nextTick(); // watcher fires → runFilter(1) starts

      // Request 2: fires while request 1 is still pending
      store.requestTripGeneration();
      await nextTick(); // watcher fires → runFilter(2) starts
      await nextTick(); // runFilter(2)'s loadGames resolves immediately
      await nextTick(); // runFilter(2) writes refs

      // Resolve stale request 1 — race guard should discard it
      resolveStale({ games: STUB_GAMES, error: null });
      await nextTick();
      await nextTick();

      // Only fresh games from request 2 survive
      expect(wrapper.vm.filteredGames).toHaveLength(1);
      expect(wrapper.vm.filteredGames[0].gameId).toBe('fresh-001');
      expect(wrapper.vm.isLoading).toBe(false);
    });
  });

  // ── isLoading safety ────────────────────────────────────────────────────────

  describe('isLoading safety', () => {
    it('resets isLoading when the latest request returns early due to null dates', async () => {
      let resolveStale!: (value: GameLoadResult) => void;
      const stalePromise = new Promise<GameLoadResult>(
        (resolve) => { resolveStale = resolve; },
      );

      vi.spyOn(gameService, 'loadGames').mockReturnValueOnce(stalePromise);

      const wrapper = mountWithComposable();
      const store = useTripStore();
      store.setStartDate('2026-06-01');
      store.setEndDate('2026-06-30');

      // Request 1: in-flight, isLoading = true
      store.requestTripGeneration();
      await nextTick();
      expect(wrapper.vm.isLoading).toBe(true);

      // Clear dates, then fire request 2 — runFilter(2) returns early from null-dates guard
      store.clearDates();
      store.requestTripGeneration();
      await nextTick(); // watcher fires → runFilter(2): !startDate → resets isLoading=false
      await nextTick();

      // Resolve stale request 1 — race guard discards it
      resolveStale({ games: STUB_GAMES, error: null });
      await nextTick();
      await nextTick();

      // isLoading must not be stuck
      expect(wrapper.vm.isLoading).toBe(false);
      expect(wrapper.vm.filteredGames).toHaveLength(0);
    });
  });
});
