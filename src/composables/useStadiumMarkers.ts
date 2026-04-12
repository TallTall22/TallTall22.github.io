// src/composables/useStadiumMarkers.ts
import { ref, watch, onBeforeUnmount } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { loadStadiums } from '@/services/stadiumService';
import type { StadiumMarkerData, MarkerStatus } from '@/types';
import type { Stadium, Trip } from '@/types';

export interface UseStadiumMarkersReturn {
  markers:   Ref<StadiumMarkerData[]>;
  isLoading: Ref<boolean>;
  error:     Ref<string | null>;
}

export function useStadiumMarkers(): UseStadiumMarkersReturn {
  const store = useTripStore();
  const { selectedTrip, homeStadiumId } = storeToRefs(store);

  const markers   = ref<StadiumMarkerData[]>([]);
  const isLoading = ref<boolean>(false);
  const error     = ref<string | null>(null);

  let requestCounter = 0;
  let isMounted      = true;
  onBeforeUnmount(() => { isMounted = false; });

  async function buildMarkers(requestId: number): Promise<void> {
    isLoading.value = true;
    error.value     = null;

    const { stadiums, error: loadError } = await loadStadiums();

    if (!isMounted) {
      isLoading.value = false; // component gone; reset before abandoning
      return;
    }
    if (requestId !== requestCounter) return; // winning request resets isLoading

    if (loadError !== null) {
      error.value     = 'Stadium data unavailable. Please refresh.';
      markers.value   = [];
      isLoading.value = false;
      return;
    }

    const trip:   Trip | null   = selectedTrip.value;
    const homeId: string | null = homeStadiumId.value;

    // Derive scheduled stadium IDs — Set for O(1) lookup
    const scheduledIds = new Set<string>();
    if (trip !== null) {
      for (const day of trip.itinerary) {
        if (day.type === 'game_day') {
          scheduledIds.add(day.stadiumId);
        }
      }
    }

    function resolveStatus(stadium: Stadium): MarkerStatus {
      // 'home' takes precedence over 'scheduled'
      if (stadium.id === homeId)        return 'home';
      if (scheduledIds.has(stadium.id)) return 'scheduled';
      return 'unscheduled';
    }

    const result: StadiumMarkerData[] = stadiums
      .filter((s) => {
        // Defensive: skip stadiums with invalid coordinates
        const valid = Number.isFinite(s.coordinates.lat) && Number.isFinite(s.coordinates.lng);
        if (!valid && import.meta.env.DEV) {
          console.warn('[useStadiumMarkers] Invalid coordinates for stadium:', s.id);
        }
        return valid;
      })
      .map((s): StadiumMarkerData => ({
        stadiumId:       s.id,
        teamName:        s.teamName,
        teamNickname:    s.teamNickname,
        stadiumName:     s.stadiumName,
        city:            s.city,
        state:           s.state,
        lat:             s.coordinates.lat,
        lng:             s.coordinates.lng,
        logoUrl:         s.logoUrl,
        stadiumPhotoUrl: s.stadiumPhotoUrl,
        status:          resolveStatus(s),
      }));

    if (!isMounted || requestId !== requestCounter) return;

    markers.value   = result;
    isLoading.value = false;
  }

  watch(
    [selectedTrip, homeStadiumId],
    () => {
      requestCounter++;
      void buildMarkers(requestCounter);
    },
    { immediate: true },
  );

  return { markers, isLoading, error };
}
