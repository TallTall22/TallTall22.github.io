<script setup lang="ts">
import { ref, shallowRef, provide, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import { useMapStore } from '@/stores/mapStore';
import { useMapPolylines } from '@/composables/useMapPolylines';
import { useMapBounds } from '@/composables/useMapBounds';
import MapPolylineLayer from './MapPolylineLayer.vue';
import MapBoundsManager from './MapBoundsManager.vue';
import MapLoadingOverlay from './MapLoadingOverlay.vue';
import MapErrorBanner from './MapErrorBanner.vue';
import type { MapViewProps } from '@/types';

withDefaults(defineProps<MapViewProps>(), {
  isLoading: false,
  hasError:  false,
  errorMsg:  null,
});

const mapStore = useMapStore();
const { segments } = useMapPolylines();
const { bounds }   = useMapBounds(segments);

const mapEl       = ref<HTMLDivElement | null>(null);
const mapInstance = shallowRef<L.Map | null>(null);

// Must provide at script-setup level so child components can inject synchronously
provide(LEAFLET_MAP_KEY, mapInstance);

onMounted(() => {
  if (!mapEl.value) return;

  try {
    const map = L.map(mapEl.value, {
      center:      [mapStore.center.lat, mapStore.center.lng],
      zoom:        mapStore.zoom,
      zoomControl: true,
    });

    const tileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      },
    );

    tileLayer.on('tileerror', () => {
      if (!mapStore.hasError) {
        mapStore.setError('Map tiles unavailable. Check your internet connection.');
      }
    });

    tileLayer.addTo(map);

    // Sync user pan/zoom back to store so mapStore.center/zoom stay current
    map.on('moveend', () => {
      const c = map.getCenter();
      mapStore.setCenter({ lat: c.lat, lng: c.lng });
    });
    map.on('zoomend', () => {
      mapStore.setZoom(map.getZoom());
    });

    mapInstance.value = map;
    mapStore.setReady(true);
  } catch (err) {
    mapStore.setError('Map initialization failed. Please refresh the page.');
    if (import.meta.env.DEV) {
      console.error('[MapViewContainer] Leaflet init error:', err);
    }
  }
});

onBeforeUnmount(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
    mapInstance.value = null;
  }
  mapStore.setReady(false);
});
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapEl" class="map-container" />

    <template v-if="mapInstance">
      <MapPolylineLayer :segments="segments" />
      <MapBoundsManager :bounds="bounds" />
    </template>

    <MapLoadingOverlay :visible="isLoading ?? false" />

    <MapErrorBanner
      v-if="(hasError && errorMsg) || mapStore.hasError"
      :message="mapStore.hasError ? (mapStore.errorMsg ?? 'Map error') : (errorMsg ?? '')"
    />
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
