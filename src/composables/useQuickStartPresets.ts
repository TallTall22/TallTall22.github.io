// src/composables/useQuickStartPresets.ts
import { ref, watch, nextTick, onMounted } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import { todayISO, addDays } from '@/composables/useDateRange';
import { QUICK_START_PRESETS } from '@/data/presets';
import type { QuickStartPreset, PresetRegion, PresetAppliedEvent } from '@/types/presets';
import { loadStadiums } from '@/services/stadiumService';

// Module-level flag: ensures DEV validation runs only once per app lifecycle,
// even if useQuickStartPresets is called from multiple component instances.
let devValidationDone = false;

/** Resets the DEV validation flag. Exposed for test isolation only. */
export function _resetDevValidation(): void {
  devValidationDone = false;
}

export interface UseQuickStartPresetsReturn {
  /** Static list of all presets */
  readonly presets: readonly QuickStartPreset[];
  /** ID of currently active preset; null when none or when store values diverged */
  activePresetId:      Ref<PresetRegion | null>;
  /** Confirmation message shown in snackbar; null when hidden */
  confirmationMessage: Ref<string | null>;
  /** True while snackbar is visible */
  showSnackbar:        Ref<boolean>;
  /**
   * Apply a preset: sets homeStadiumId, startDate, endDate in store synchronously.
   * Triggers snackbar. Calls store.requestTripGeneration().
   * Returns the PresetAppliedEvent for the organism to re-emit.
   */
  applyPreset:     (preset: QuickStartPreset) => PresetAppliedEvent;
  /** Programmatically dismiss the snackbar */
  dismissSnackbar: () => void;
  /** Mirrors tripStore.isLoading — true while the F-04/F-05 pipeline is running */
  isTripGenerating: Ref<boolean>;
}

export function useQuickStartPresets(): UseQuickStartPresetsReturn {
  const store = useTripStore();
  const { startDate, endDate, homeStadiumId, isLoading } = storeToRefs(store);

  const activePresetId      = ref<PresetRegion | null>(null);
  const confirmationMessage = ref<string | null>(null);
  const showSnackbar        = ref<boolean>(false);

  // Plain boolean guard — NOT a ref — suppresses desync watcher
  // during applyPreset's own synchronous store writes.
  let isApplyingPreset = false;

  /**
   * Desync watcher: resets activePresetId when store values change externally
   * (e.g., user manually edits DateRangePicker or StadiumSelector).
   * The isApplyingPreset guard prevents false-positive resets during applyPreset.
   */
  watch([startDate, endDate, homeStadiumId], () => {
    if (isApplyingPreset) return;
    activePresetId.value = null;
  });

  // DEV-only: validate preset stadium IDs against loaded stadiums data
  onMounted(async () => {
    if (!import.meta.env.DEV) return;
    if (devValidationDone) return;
    devValidationDone = true;
    const result = await loadStadiums();
    if (result.error !== null) return; // can't validate without data
    const loadedIds = new Set(result.stadiums.map((s) => s.id));
    for (const preset of QUICK_START_PRESETS) {
      if (!loadedIds.has(preset.startStadiumId)) {
        console.warn(
          `[F-03] Preset "${preset.name}" has startStadiumId "${preset.startStadiumId}" ` +
          `which does not match any loaded Stadium.id. ` +
          `Check src/data/presets.ts and src/assets/data/stadiums.json.`,
        );
      }
    }
  });

  function applyPreset(preset: QuickStartPreset): PresetAppliedEvent {
    isApplyingPreset = true;

    const today  = todayISO();
    const endIso = addDays(today, preset.durationDays);

    store.setHomeStadium(preset.startStadiumId);
    store.setStartDate(today);
    store.setEndDate(endIso);

    activePresetId.value      = preset.id;
    confirmationMessage.value = `已套用「${preset.name}」預設行程 ✓`;
    showSnackbar.value        = true;

    store.requestTripGeneration();

    // Re-enable watcher after Vue has flushed all reactive updates
    void nextTick(() => {
      isApplyingPreset = false;
    });

    return {
      preset,
      startDate:     today,
      endDate:       endIso,
      homeStadiumId: preset.startStadiumId,
    };
  }

  function dismissSnackbar(): void {
    showSnackbar.value = false;
  }

  return {
    presets:             QUICK_START_PRESETS,
    activePresetId,
    confirmationMessage,
    showSnackbar,
    applyPreset,
    dismissSnackbar,
    isTripGenerating:    isLoading,
  };
}
