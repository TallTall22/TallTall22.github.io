// src/composables/useLoadingStage.ts
import { computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { LoadingStage } from '@/types/models';

export interface UseLoadingStageReturn {
  stage:      ComputedRef<LoadingStage>;
  stageLabel: ComputedRef<string>;
  isActive:   ComputedRef<boolean>;
}

const STAGE_LABELS: Record<LoadingStage, string> = {
  idle:      '',
  filtering: '正在篩選比賽資料...',
  routing:   '正在計算最佳行程路線...',
};

export function useLoadingStage(
  isFiltering: Ref<boolean>,
  isRouting:   Ref<boolean>,
): UseLoadingStageReturn {
  const stage = computed<LoadingStage>(() => {
    if (isFiltering.value) return 'filtering';
    if (isRouting.value)   return 'routing';
    return 'idle';
  });

  const stageLabel = computed(() => STAGE_LABELS[stage.value]);
  const isActive   = computed(() => stage.value !== 'idle');

  return { stage, stageLabel, isActive };
}
