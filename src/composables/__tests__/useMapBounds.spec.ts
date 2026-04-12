// src/composables/__tests__/useMapBounds.spec.ts
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';

import { useMapBounds } from '../useMapBounds';
import type { MapPolylineSegment } from '@/types/map';

// ── Fixture helper ────────────────────────────────────────────────────────────

function makeSegment(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  index: number = 0,
): MapPolylineSegment {
  return {
    id: `seg-${index}`,
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    segmentType: 'game_day',
    dayIndex: index,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('useMapBounds', () => {

  // ── 1: empty segments ───────────────────────────────────────────────────────

  it('returns null for empty segments', () => {
    const segments = ref<MapPolylineSegment[]>([]);
    const { bounds } = useMapBounds(segments);

    expect(bounds.value).toBeNull();
  });

  // ── 2: single segment ───────────────────────────────────────────────────────

  it('returns tight bounds for single segment', () => {
    const segments = ref<MapPolylineSegment[]>([
      makeSegment(10, 20, 30, 40),
    ]);
    const { bounds } = useMapBounds(segments);

    expect(bounds.value).toEqual({ north: 30, south: 10, east: 40, west: 20 });
  });

  // ── 3: multiple segments — correct min/max ──────────────────────────────────

  it('returns correct min/max bounds across multiple segments', () => {
    const segments = ref<MapPolylineSegment[]>([
      makeSegment(10, 20, 30, 40, 0), // lat range: 10–30; lng range: 20–40
      makeSegment(5, 15, 25, 50, 1),  // lat range: 5–25;  lng range: 15–50
    ]);
    const { bounds } = useMapBounds(segments);

    // north = max of all lats = 30
    // south = min of all lats = 5
    // east  = max of all lngs = 50
    // west  = min of all lngs = 15
    expect(bounds.value).toEqual({ north: 30, south: 5, east: 50, west: 15 });
  });

  // ── 4: reactive update ──────────────────────────────────────────────────────

  it('updates reactively when segments change', () => {
    const segments = ref<MapPolylineSegment[]>([]);
    const { bounds } = useMapBounds(segments);

    // initially empty → null
    expect(bounds.value).toBeNull();

    // add one segment
    segments.value = [makeSegment(10, 20, 30, 40)];

    expect(bounds.value).not.toBeNull();
    expect(bounds.value).toEqual({ north: 30, south: 10, east: 40, west: 20 });
  });
});
