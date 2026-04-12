// src/composables/useMapPolylines.ts
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { loadStadiums } from '@/services/stadiumService';
import type { MapPolylineSegment, SegmentType } from '@/types';
import type { TripDay, Stadium } from '@/types';

export interface UseMapPolylinesReturn {
  segments:  Ref<MapPolylineSegment[]>;
  isLoading: Ref<boolean>;
  error:     Ref<string | null>;
}

export function useMapPolylines(): UseMapPolylinesReturn {
  const store = useTripStore();
  const { selectedTrip } = storeToRefs(store);

  const segments  = ref<MapPolylineSegment[]>([]);
  const isLoading = ref<boolean>(false);
  const error     = ref<string | null>(null);

  let requestCounter = 0;
  let isMounted      = true;
  onBeforeUnmount(() => { isMounted = false; });

  function getStadiumId(day: TripDay): string | undefined {
    // Both GameDay and TravelDay have stadiumId; TravelDay.stadiumId is optional
    return day.stadiumId;
  }

  async function buildSegments(requestId: number): Promise<void> {
    const trip = selectedTrip.value;

    if (trip === null) {
      if (isMounted && requestId === requestCounter) {
        segments.value  = [];
        isLoading.value = false;
      }
      return;
    }

    isLoading.value = true;
    error.value     = null;

    // Load stadiums (cached after first call — safe to call multiple times)
    const { stadiums, error: loadError } = await loadStadiums();

    if (!isMounted || requestId !== requestCounter) return;

    if (loadError !== null) {
      error.value     = 'Stadium data unavailable';
      segments.value  = [];
      isLoading.value = false;
      return;
    }

    // Build O(1) lookup
    const stadiumMap = new Map<string, Stadium>(stadiums.map(s => [s.id, s]));

    const result: MapPolylineSegment[] = [];
    const itinerary = trip.itinerary;

    for (let i = 0; i < itinerary.length - 1; i++) {
      const fromDay = itinerary[i];
      const toDay   = itinerary[i + 1];

      const fromId = getStadiumId(fromDay);
      const toId   = getStadiumId(toDay);

      // Skip if either stadiumId is missing
      if (!fromId || !toId) continue;

      const fromStadium = stadiumMap.get(fromId);
      const toStadium   = stadiumMap.get(toId);

      // Skip if either stadium is not found in lookup
      if (!fromStadium || !toStadium) continue;

      // Skip zero-distance segments (same stadium on consecutive days)
      if (fromId === toId) continue;

      const segmentType: SegmentType =
        fromDay.type === 'game_day' ? 'game_day' : 'travel_day';

      result.push({
        id:          `${fromId}|${toId}|day${i}`,
        from:        { lat: fromStadium.coordinates.lat, lng: fromStadium.coordinates.lng },
        to:          { lat: toStadium.coordinates.lat,   lng: toStadium.coordinates.lng },
        segmentType,
        dayIndex:    i,
      });
    }

    if (!isMounted || requestId !== requestCounter) return;

    segments.value  = result;
    isLoading.value = false;
  }

  watch(
    selectedTrip,
    () => {
      requestCounter++;
      void buildSegments(requestCounter);
    },
    { immediate: true },
  );

  return { segments, isLoading, error };
}
