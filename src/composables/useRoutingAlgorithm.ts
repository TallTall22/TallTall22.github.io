// src/composables/useRoutingAlgorithm.ts
//
// F-05: Reactive composable that runs the greedy routing algorithm whenever
// filteredGames changes (after useGameFilter completes) and writes the result
// to tripStore.selectedTrip via store.setSelectedTrip().
//
// Accepts filteredGames as an explicit parameter to prevent double-instance
// of useGameFilter when App.vue wires both composables (P1-7).
// Race condition protection: requestCounter version stamp (same pattern as useGameFilter).

import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { computeTrip } from '@/services/routingService';
import type { Game, RoutingAlgorithmErrorCode } from '@/types/models';

export interface UseRoutingAlgorithmReturn {
  /** true while computeTrip() is in-flight. */
  isRouting:     Ref<boolean>;
  /** Last routing error code; null = no error. */
  routingError:  Ref<RoutingAlgorithmErrorCode | null>;
}

export function useRoutingAlgorithm(filteredGames: Ref<Game[]>): UseRoutingAlgorithmReturn {
  const store = useTripStore();
  const { homeStadiumId, startDate, endDate, routingMode } = storeToRefs(store);

  const isRouting     = ref<boolean>(false);
  const routingError  = ref<RoutingAlgorithmErrorCode | null>(null);

  // Version stamp for race-condition protection.
  // Uses a private counter (NOT tripGenerationRequestId) because our trigger
  // is filteredGames changes, not store increments.
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
      routingMode:   routingMode.value,
    });

    // Race condition guard: a newer request supersedes this one
    if (!isMounted || requestId !== requestCounter) return;

    if (result.error !== null) {
      routingError.value = result.error;
      store.setSelectedTrip(null);
    } else {
      store.setSelectedTrip(result.trip);
    }
    isRouting.value = false;
  }

  // Watch filteredGames — fires after useGameFilter writes its result.
  watch(
    filteredGames,
    () => {
      requestCounter++;
      void runRouting(requestCounter);
    },
    { deep: false, immediate: false },
  );

  // Watch routingMode — re-trigger routing when mode changes.
  watch(
    routingMode,
    () => {
      requestCounter++;
      void runRouting(requestCounter);
    },
    { deep: false, immediate: false },
  );

  return { isRouting, routingError };
}
