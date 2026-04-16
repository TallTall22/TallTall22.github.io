<script setup lang="ts">
import { computed } from 'vue';
import type { LoadingStage } from '@/types/models';
import type { LoadingStageBarProps } from '@/types/components';

const props = defineProps<LoadingStageBarProps>();

const STAGE_LABELS: Record<LoadingStage, string> = {
  idle:      '',
  filtering: '正在篩選比賽資料...',
  routing:   '正在計算最佳行程路線...',
};

const stageLabel = computed(() => STAGE_LABELS[props.stage]);
</script>

<template>
  <Transition name="slide-stage">
    <div
      v-if="props.stage !== 'idle'"
      class="loading-stage-bar"
      role="status"
      :aria-label="stageLabel"
    >
      <v-progress-linear indeterminate color="primary" height="3" />
      <div class="stage-label">
        <v-icon icon="mdi-baseball" size="14" color="primary" class="mr-1" />
        <span>{{ stageLabel }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-stage-bar {
  background: rgba(0, 45, 114, 0.06);
  border-bottom: 1px solid rgba(0, 45, 114, 0.12);
}
.stage-label {
  display: flex;
  align-items: center;
  padding: 4px 16px 6px;
  font-size: 12px;
  color: #002D72;
  font-weight: 500;
}
.slide-stage-enter-active,
.slide-stage-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.slide-stage-enter-from,
.slide-stage-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-stage-enter-to,
.slide-stage-leave-from {
  opacity: 1;
  max-height: 60px;
}
</style>
