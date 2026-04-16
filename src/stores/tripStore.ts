// src/stores/tripStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ISODateString, Trip, RoutingMode } from '@/types';

export const useTripStore = defineStore('trip', () => {
  const startDate = ref<ISODateString | null>(null);
  const endDate = ref<ISODateString | null>(null);
  const homeStadiumId = ref<string | null>(null);
  const selectedTrip = ref<Trip | null>(null);
  const _tripGenId   = ref<number>(0);
  const routingMode  = ref<RoutingMode>('regional');

  const hasDateRange= computed(() => startDate.value !== null && endDate.value !== null);
  const hasHomeStadium = computed(() => homeStadiumId.value !== null);

  function setStartDate(date: ISODateString | null): void {
    startDate.value = date;
    if (date && endDate.value && endDate.value < date) {
      endDate.value = null;
    }
  }

  function setEndDate(date: ISODateString | null): void {
    endDate.value = date;
  }

  function clearDates(): void {
    startDate.value = null;
    endDate.value = null;
  }

  function setHomeStadium(id: string | null): void {
    homeStadiumId.value = id;
  }

  /**
   * F-03.4 stub: called after a preset is applied or manually by F-04 orchestrator.
   * F-04 will watch `tripGenerationRequestId` (readonly computed) to trigger the routing algorithm.
   * Each call increments the counter so repeated calls always trigger the watcher.
   */
  function requestTripGeneration(): void {
    _tripGenId.value += 1;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[F-03 → F-04 hook] requestTripGeneration called, id:', _tripGenId.value);
    }
  }

  function setRoutingMode(mode: RoutingMode): void {
    routingMode.value = mode;
  }

  function setSelectedTrip(trip: Trip | null): void {
    selectedTrip.value = trip;
  }

  function reset(): void {
    startDate.value     = null;
    endDate.value       = null;
    homeStadiumId.value = null;
    selectedTrip.value  = null;
    _tripGenId.value    = 0;
    routingMode.value   = 'regional';
  }

  const tripGenerationRequestId = computed(() => _tripGenId.value);

  return {
    startDate,
    endDate,
    selectedTrip,
    hasDateRange,
    setStartDate,
    setEndDate,
    clearDates,
    homeStadiumId,
    hasHomeStadium,
    setHomeStadium,
    setSelectedTrip,
    tripGenerationRequestId,
    requestTripGeneration,
    routingMode,
    setRoutingMode,
    reset,
  };
});
