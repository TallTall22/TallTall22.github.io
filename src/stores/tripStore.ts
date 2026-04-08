// src/stores/tripStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ISODateString, Trip } from '@/types';

export const useTripStore = defineStore('trip', () => {
  const startDate = ref<ISODateString | null>(null);
  const endDate = ref<ISODateString | null>(null);
  const homeStadiumId = ref<string | null>(null);
  const selectedTrip = ref<Trip | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasDateRange = computed(() => startDate.value !== null && endDate.value !== null);
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

  return {
    startDate,
    endDate,
    selectedTrip,
    isLoading,
    error,
    hasDateRange,
    setStartDate,
    setEndDate,
    clearDates,
    homeStadiumId,
    hasHomeStadium,
    setHomeStadium,
  };
});
