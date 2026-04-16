<script setup lang="ts">
import { computed } from 'vue';
import { useTripStore } from '@/stores/tripStore';
import type { RoutingMode } from '@/types/models';

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const store = useTripStore();

const modeDescriptions: Record<RoutingMode, string> = {
  regional: '以起點球場所在區域為主，行程緊湊不長途跋涉',
  tourism:  '盡量拜訪不同球場，最大化觀賽球場數',
};

const description = computed(() => modeDescriptions[store.routingMode]);

function onModeChange(mode: RoutingMode | null): void {
  if (mode === null) return; // v-btn-toggle can emit null when clicking active button; ignore
  store.setRoutingMode(mode);
  if (store.selectedTrip !== null) {
    store.requestTripGeneration();
  }
}
</script>

<template>
  <div>
    <div class="text-subtitle-2 font-weight-medium mb-2">路線規劃模式</div>
    <v-btn-toggle
      :model-value="store.routingMode"
      color="primary"
      variant="outlined"
      density="comfortable"
      mandatory
      class="mb-2"
      :disabled="disabled"
      @update:model-value="onModeChange"
    >
      <v-btn value="regional" prepend-icon="mdi-map-marker-radius">
        快速行程
      </v-btn>
      <v-btn value="tourism" prepend-icon="mdi-stadium-variant">
        觀光之旅
      </v-btn>
    </v-btn-toggle>
    <div class="text-caption text-medium-emphasis">{{ description }}</div>
  </div>
</template>
