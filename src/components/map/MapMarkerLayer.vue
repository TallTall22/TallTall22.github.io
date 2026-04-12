<script setup lang="ts">
import { inject, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import { createMarkerDivIcon } from '@/utils/markerIconUtils';
import { buildPopupHtml } from '@/utils/popupContentUtils';
import { buildTooltipText } from '@/utils/tooltipContentUtils';
import type { MapMarkerLayerProps } from '@/types/components';

const props = defineProps<MapMarkerLayerProps>();

const mapRef     = inject(LEAFLET_MAP_KEY);
const layerGroup = ref<L.LayerGroup | null>(null);

function drawMarkers(): void {
  const map = mapRef?.value;
  if (!map) {
    if (import.meta.env.DEV) {
      console.warn('[MapMarkerLayer] Map not ready, skipping draw');
    }
    return;
  }

  if (layerGroup.value) {
    layerGroup.value.clearLayers();
  } else {
    layerGroup.value = L.layerGroup().addTo(map);
  }

  for (const data of props.markers) {
    const icon   = createMarkerDivIcon(data.status);
    const marker = L.marker([data.lat, data.lng], { icon, title: data.stadiumName });

    // F-07.3 / F-07.4: click → Popup InfoWindow
    marker.bindPopup(buildPopupHtml(data), {
      maxWidth:  280,
      className: 'stadium-popup-wrapper',
    });

    // F7-8: Attach error listeners after popup opens — replaces inline onerror
    // (CSP-safe: no inline event handler attributes in the HTML template).
    marker.on('popupopen', () => {
      const popupEl = marker.getPopup()?.getElement();
      if (!popupEl) return;
      popupEl.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        img.addEventListener('error', () => { img.style.display = 'none'; }, { once: true });
      });
    });

    // F-07.5: hover → Tooltip
    marker.bindTooltip(buildTooltipText(data), {
      direction: 'top',
      offset:    L.point(0, -16),
      sticky:    false,
    });

    layerGroup.value.addLayer(marker);
  }
}

onMounted(() => {
  if (props.markers.length > 0) drawMarkers();
});

// Contract: useStadiumMarkers always replaces markers.value with a new array (never mutates in-place).
// deep: false is intentional — O(1) reference check vs O(n) deep compare.
watch(
  () => props.markers,
  () => { drawMarkers(); },
  { deep: false },
);

onBeforeUnmount(() => {
  if (layerGroup.value) {
    layerGroup.value.remove();
  }
  layerGroup.value = null;
});
</script>

<template></template>
