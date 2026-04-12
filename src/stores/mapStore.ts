// src/stores/mapStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MapCoordinate } from '@/types';

export const useMapStore = defineStore('map', () => {
  // Default center: continental USA
  const center   = ref<MapCoordinate>({ lat: 39.5, lng: -98.35 });
  const zoom     = ref<number>(4);
  const isReady  = ref<boolean>(false);
  const hasError = ref<boolean>(false);
  const errorMsg = ref<string | null>(null);

  function setReady(ready: boolean): void {
    isReady.value = ready;
  }

  function setError(msg: string): void {
    hasError.value = true;
    errorMsg.value = msg;
  }

  function clearError(): void {
    hasError.value = false;
    errorMsg.value = null;
  }

  function setCenter(c: MapCoordinate): void {
    center.value = c;
  }

  function setZoom(z: number): void {
    zoom.value = z;
  }

  function reset(): void {
    center.value   = { lat: 39.5, lng: -98.35 };
    zoom.value     = 4;
    isReady.value  = false;
    hasError.value = false;
    errorMsg.value = null;
  }

  return {
    center,
    zoom,
    isReady,
    hasError,
    errorMsg,
    setReady,
    setError,
    clearError,
    setCenter,
    setZoom,
    reset,
  };
});
