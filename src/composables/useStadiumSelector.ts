// src/composables/useStadiumSelector.ts
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { loadStadiums } from '@/services/stadiumService';
import type { Stadium, StadiumLoadErrorCode } from '@/types/models';
import type { StadiumSelectorOption } from '@/types/components';

export interface UseStadiumSelectorReturn {
  stadiums: Ref<Stadium[]>;
  options: ComputedRef<StadiumSelectorOption[]>;
  homeStadiumId: Ref<string | null>;
  selectedOption: ComputedRef<StadiumSelectorOption | null>;
  isLoading: Ref<boolean>;
  loadError: Ref<StadiumLoadErrorCode | null>;
  onSelect: (option: StadiumSelectorOption | null) => void;
  onClear: () => void;
}

export function useStadiumSelector(): UseStadiumSelectorReturn {
  const store = useTripStore();
  const { homeStadiumId } = storeToRefs(store);

  const stadiums  = ref<Stadium[]>([]);
  const isLoading = ref<boolean>(false);
  const loadError = ref<StadiumLoadErrorCode | null>(null);

  /** Map each stadium to an autocomplete option with pre-built searchable label */
  const options = computed<StadiumSelectorOption[]>(() =>
    stadiums.value.map((s) => ({
      label: `${s.teamName} — ${s.stadiumName} (${s.city})`,
      stadium: s,
    }))
  );

  /** Sync the currently-selected option from the store's homeStadiumId */
  const selectedOption = computed<StadiumSelectorOption | null>(() => {
    if (!homeStadiumId.value) return null;
    return options.value.find((o) => o.stadium.id === homeStadiumId.value) ?? null;
  });

  function onSelect(option: StadiumSelectorOption | null): void {
    store.setHomeStadium(option?.stadium.id ?? null);
  }

  function onClear(): void {
    store.setHomeStadium(null);
  }

  let isMounted = true;
  onBeforeUnmount(() => { isMounted = false; });

  onMounted(async () => {
    isLoading.value = true;

    const result = await loadStadiums();

    if (!isMounted) return;

    stadiums.value = result.stadiums;
    loadError.value = result.error;
    isLoading.value = false;
  });

  return {
    stadiums,
    options,
    homeStadiumId,
    selectedOption,
    isLoading,
    loadError,
    onSelect,
    onClear,
  };
}
