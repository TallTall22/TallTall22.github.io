<script setup lang="ts">
import { inject, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import { createMarkerDivIcon, createHighlightedMarkerDivIcon } from '@/utils/markerIconUtils';
import { buildPopupHtml } from '@/utils/popupContentUtils';
import { buildTooltipText } from '@/utils/tooltipContentUtils';
import { useHighlightStore } from '@/stores/highlightStore';
import type { MapMarkerLayerProps } from '@/types/components';

const props       = defineProps<MapMarkerLayerProps>();
const mapRef      = inject(LEAFLET_MAP_KEY);
const highlightStore = useHighlightStore();

const layerGroup        = ref<L.LayerGroup | null>(null);
// Internal lookup table: not reactive — rebuilt on each drawMarkers() call
const markerByStadiumId = new Map<string, L.Marker>();

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

  markerByStadiumId.clear();

  const hoveredId = highlightStore.hoveredStadiumId;

  for (const data of props.markers) {
    const isHighlighted = data.stadiumId === hoveredId;
    const icon   = isHighlighted
      ? createHighlightedMarkerDivIcon(data.status)
      : createMarkerDivIcon(data.status);
    const marker = L.marker([data.lat, data.lng], { icon, title: data.stadiumName });

    // F-09.4: map marker hover → update highlight store
    marker.on('mouseover', () => { highlightStore.setHovered(data.stadiumId); });
    marker.on('mouseout',  () => { highlightStore.clearHovered(); });

    // F-07.3 / F-07.4: click → Popup InfoWindow
    marker.bindPopup(buildPopupHtml(data), {
      maxWidth:  280,
      className: 'stadium-popup-wrapper',
    });

    // F7-8: Attach error listeners after popup opens — CSP-safe (no inline event handlers)
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
    markerByStadiumId.set(data.stadiumId, marker);
  }
}

/**
 * Update only the two affected marker icons when hoveredStadiumId changes (O(1) per change).
 * Avoids a full redraw for every mouse movement.
 */
function updateHighlight(prevId: string | null, nextId: string | null): void {
  // Restore previous marker to its normal icon
  if (prevId !== null) {
    const prevMarker = markerByStadiumId.get(prevId);
    if (prevMarker) {
      const data = props.markers.find((m) => m.stadiumId === prevId);
      if (data) prevMarker.setIcon(createMarkerDivIcon(data.status));
    }
  }

  // Apply highlighted icon to new marker
  if (nextId !== null) {
    const nextMarker = markerByStadiumId.get(nextId);
    if (nextMarker) {
      const data = props.markers.find((m) => m.stadiumId === nextId);
      if (data) nextMarker.setIcon(createHighlightedMarkerDivIcon(data.status));
    }
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

// F-09: react to hoveredStadiumId changes with O(1) icon swap — no full redraw needed
watch(
  () => highlightStore.hoveredStadiumId,
  (nextId, prevId) => { updateHighlight(prevId ?? null, nextId); },
);

onBeforeUnmount(() => {
  if (layerGroup.value) {
    layerGroup.value.remove();
  }
  layerGroup.value = null;
  markerByStadiumId.clear();
});
</script>

<template></template>
