// src/composables/useRoutingAlgorithm.ts
//
// F-05: Reactive composable that runs the greedy routing algorithm whenever
// filteredGames changes (after useGameFilter completes) and writes the result
// to tripStore.selectedTrip.
//
// Race condition protection: requestCounter version stamp (same pattern as useGameFilter).

import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { useGameFilter } from '@/composables/useGameFilter';
import { computeTrip } from '@/services/routingService';
import type { Trip, RoutingAlgorithmErrorCode } from '@/types/models';

export interface UseRoutingAlgorithmReturn {
  /** The last successfully computed trip; null if not yet computed or on error. */
  generatedTrip: Ref<Trip | null>;
  /** true while computeTrip() is in-flight. */
  isRouting:     Ref<boolean>;
  /** Last routing error code; null = no error. */
  routingError:  Ref<RoutingAlgorithmErrorCode | null>;
}

export function useRoutingAlgorithm(): UseRoutingAlgorithmReturn {
  const store = useTripStore();
  const { homeStadiumId, startDate, endDate } = storeToRefs(store);

  // F-04 → F-05 pipeline: consume filteredGames from the game filter composable.
  // Both composables watch tripGenerationRequestId; F-04 runs first (data load),
  // then filteredGames becomes reactive, triggering our watcher here.
  const { filteredGames } = useGameFilter();

  const generatedTrip = ref<Trip | null>(null);
  const isRouting     = ref<boolean>(false);
  const routingError  = ref<RoutingAlgorithmErrorCode | null>(null);

  // Version stamp for race-condition protection
  let requestCounter = 0;

  let isMounted = true;
  onBeforeUnmount(() => { isMounted = false; });

  async function runRouting(requestId: number): Promise<void> {
    // Guard: require all inputs; reset loading state if we're the latest request
    if (!homeStadiumId.value || !startDate.value || !endDate.value) {
      if (requestId === requestCounter) {
        isRouting.value = false;
      }
      return;
    }

    isRouting.value    = true;
    routingError.value = null;

    const result = await computeTrip(filteredGames.value, {
      startDate:     startDate.value,
      endDate:       endDate.value,
      homeStadiumId: homeStadiumId.value,
    });

    // Race condition guard: a newer request supersedes this one
    if (!isMounted || requestId !== requestCounter) return;

    if (result.error !== null) {
      routingError.value  = result.error;
      generatedTrip.value = null;
      store.selectedTrip  = null;
    } else {
      generatedTrip.value = result.trip;
      store.selectedTrip  = result.trip;
    }
    isRouting.value = false;
  }

  // Watch filteredGames — fires after useGameFilter writes its result
  const stopWatcher = watch(
    filteredGames,
    () => {
      requestCounter++;
      void runRouting(requestCounter);
    },
    { deep: false, immediate: false },
  );

  onBeforeUnmount(() => { stopWatcher(); });

  return { generatedTrip, isRouting, routingError };
}
