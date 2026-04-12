// src/composables/useMapBounds.ts
import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { MapPolylineSegment, MapBounds } from '@/types';

export function useMapBounds(
  segments: Ref<MapPolylineSegment[]>,
): { bounds: ComputedRef<MapBounds | null> } {
  const bounds = computed<MapBounds | null>(() => {
    if (segments.value.length === 0) return null;

    let north = -Infinity;
    let south =  Infinity;
    let east  = -Infinity;
    let west  =  Infinity;

    for (const seg of segments.value) {
      north = Math.max(north, seg.from.lat, seg.to.lat);
      south = Math.min(south, seg.from.lat, seg.to.lat);
      east  = Math.max(east,  seg.from.lng, seg.to.lng);
      west  = Math.min(west,  seg.from.lng, seg.to.lng);
    }

    return { north, south, east, west };
  });

  return { bounds };
}
