<script setup lang="ts">
import { inject, watch } from 'vue';
import { LEAFLET_MAP_KEY } from '@/composables/mapInjectionKeys';
import type { MapBounds } from '@/types';

export interface MapBoundsManagerProps {
  bounds: MapBounds | null;
}

const props = defineProps<MapBoundsManagerProps>();

const mapRef = inject(LEAFLET_MAP_KEY);

function fitBounds(bounds: MapBounds): void {
  const map = mapRef?.value;
  if (!map) return;
  map.fitBounds(
    [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ],
    { padding: [50, 50], maxZoom: 10 },
  );
}

// React to bounds prop changes
watch(
  () => props.bounds,
  (newBounds) => {
    if (newBounds !== null) fitBounds(newBounds);
  },
);

// React to map becoming available when bounds are already set
watch(
  () => mapRef?.value,
  (newMap) => {
    if (newMap && props.bounds !== null) fitBounds(props.bounds);
  },
);
</script>

<template></template>
