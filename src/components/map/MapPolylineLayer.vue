<script setup lang="ts">
import { inject, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet-arrowheads';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import type { MapPolylineLayerProps } from '@/types/components';
import type { SegmentType } from '@/types';

const props = defineProps<MapPolylineLayerProps>();

const mapRef = inject(LEAFLET_MAP_KEY);

const layerGroup = ref<L.LayerGroup | null>(null);

function getPolylineStyle(segmentType: SegmentType): L.PolylineOptions {
  if (segmentType === 'game_day') {
    return { color: '#002D72', weight: 3, opacity: 0.9 };
  }
  return { color: '#FF6B35', weight: 2, opacity: 0.8, dashArray: '8, 8' };
}

function drawSegments(): void {
  const map = mapRef?.value;
  if (!map) {
    if (import.meta.env.DEV) {
      console.warn('[MapPolylineLayer] Map not ready, skipping draw');
    }
    return;
  }

  if (layerGroup.value) {
    layerGroup.value.clearLayers();
  } else {
    layerGroup.value = L.layerGroup().addTo(map);
  }

  for (const seg of props.segments) {
    const latlngs: L.LatLngTuple[] = [
      [seg.from.lat, seg.from.lng],
      [seg.to.lat, seg.to.lng],
    ];
    const polyline = L.polyline(latlngs, getPolylineStyle(seg.segmentType));
    polyline.arrowheads({ frequency: 'endonly', size: '10px', fill: true });
    layerGroup.value.addLayer(polyline);
  }
}

onMounted(() => {
  drawSegments();
});

watch(
  () => props.segments,
  () => {
    drawSegments();
  },
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
