// src/composables/useGameFilter.ts
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { loadGames } from '@/services/gameService';
import type {
  Game,
  GameLoadErrorCode,
  GameFilterOptions,
  FilteredGamesResult,
} from '@/types/models';

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * F-04.1: Filter games by date range (inclusive on both ends).
 * Uses string comparison: ISODateString "YYYY-MM-DD" guarantees lexical order = chronological order.
 */
export function filterByDateRange(
  games: Game[],
  options: GameFilterOptions,
): Game[] {
  const { startDate, endDate } = options;
  return games.filter(
    (g) => g.date >= startDate && g.date <= endDate,
  );
}

/**
 * F-04.2: Data integrity guard — drop records with missing or empty homeTeamId.
 * In a well-formed MLB schedule every game has a homeTeamId, so this rarely
 * removes anything; it prevents downstream NaN from haversineDistance on
 * corrupt data entries.
 */
export function filterValidHomeGames(games: Game[]): Game[] {
  return games.filter(
    (g) => typeof g.homeTeamId === 'string' && g.homeTeamId.length > 0,
  );
}

/**
 * F-04.3: Deduplicate by gameId (last-writer wins via Map).
 * Returns unique array and count of removed duplicates.
 */
export function deduplicateByGameId(games: Game[]): {
  unique: Game[];
  duplicatesRemoved: number;
} {
  const map = new Map<string, Game>();
  for (const game of games) {
    map.set(game.gameId, game);
  }
  return {
    unique: Array.from(map.values()),
    duplicatesRemoved: games.length - map.size,
  };
}

/**
 * F-04.4: Sort by date ASC; secondary sort by startTimeUtc ASC for same-date games.
 * Returns a new array (does NOT mutate input).
 */
export function sortByDate(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.startTimeUtc.localeCompare(b.startTimeUtc);
  });
}

/**
 * F-04 pipeline: applies all pure functions in order and returns FilteredGamesResult.
 * Order: filterHomeOnly → filterByDateRange → deduplicateByGameId → sortByDate
 */
export function applyGameFilters(
  allGames: Game[],
  options: GameFilterOptions,
): FilteredGamesResult {
  const homeOnly                      = filterValidHomeGames(allGames);
  const dateFiltered                  = filterByDateRange(homeOnly, options);
  const { unique, duplicatesRemoved } = deduplicateByGameId(dateFiltered);
  const sorted                        = sortByDate(unique);

  return {
    games:             sorted,
    rawCount:          allGames.length,
    filteredCount:     dateFiltered.length,
    duplicatesRemoved,
  };
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseGameFilterReturn {
  /** Filtered, deduplicated, sorted game list (consumed by F-05) */
  filteredGames: Ref<Game[]>;
  /** Latest filter run statistics */
  filterResult:  Ref<FilteredGamesResult | null>;
  /** Service-layer load error code; null = no error */
  loadError:     Ref<GameLoadErrorCode | null>;
  /** true while async filter is running */
  isLoading:     Ref<boolean>;
}

export function useGameFilter(): UseGameFilterReturn {
  const store = useTripStore();
  const { startDate, endDate, tripGenerationRequestId } = storeToRefs(store);

  const filteredGames = ref<Game[]>([]);
  const filterResult  = ref<FilteredGamesResult | null>(null);
  const loadError     = ref<GameLoadErrorCode | null>(null);
  const isLoading     = ref<boolean>(false);

  let isMounted = true;
  onBeforeUnmount(() => {
    isMounted = false;
    // The anonymous watch() registered in setup() is auto-stopped by Vue on unmount.
    // The isMounted flag guards in-flight async operations.
  });

  async function runFilter(requestId: number): Promise<void> {
    // Guard: if dates are incomplete and this is the latest request, reset loading state
    if (!startDate.value || !endDate.value) {
      if (requestId === tripGenerationRequestId.value) {
        isLoading.value = false;
      }
      return;
    }

    isLoading.value = true;
    loadError.value = null;

    const result = await loadGames();

    // Race condition guard: a newer request supersedes this one; it will manage isLoading
    if (!isMounted || requestId !== tripGenerationRequestId.value) return;

    if (result.error !== null) {
      loadError.value     = result.error;
      filteredGames.value = [];
      filterResult.value  = null;
      isLoading.value     = false;
      return;
    }

    const applied = applyGameFilters(result.games, {
      startDate: startDate.value,
      endDate:   endDate.value,
    });

    filteredGames.value = applied.games;
    filterResult.value  = applied;
    isLoading.value     = false;

    if (import.meta.env.DEV && applied.duplicatesRemoved > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[F-04] deduplicateByGameId removed ${applied.duplicatesRemoved} duplicate(s).`,
        'Check games.json data source for duplicate gameIds.',
      );
    }
  }

  // F-03 → F-04 hook: watch tripGenerationRequestId, non-immediate (id=0 is initial value)
  watch(
    tripGenerationRequestId,
    (newId) => { void runFilter(newId); },
    { immediate: false },
  );

  return { filteredGames, filterResult, loadError, isLoading };
}
