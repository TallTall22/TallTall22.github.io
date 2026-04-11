<script setup lang="ts">
import type { PresetButtonGroupProps, PresetButtonGroupEmits } from '@/types/components';
import type { QuickStartPreset } from '@/types/presets';
import PresetBadge from './PresetBadge.vue';

withDefaults(defineProps<PresetButtonGroupProps>(), {
  activePresetId: null,
  disabled:       false,
});

const emit = defineEmits<PresetButtonGroupEmits>();

function handleSelect(preset: QuickStartPreset): void {
  emit('preset-selected', preset);
}
</script>

<template>
  <div
    class="preset-button-group"
    role="group"
    aria-label="快速行程預設"
  >
    <PresetBadge
      v-for="preset in presets"
      :key="preset.id"
      :preset="preset"
      :is-active="activePresetId === preset.id"
      :disabled="disabled"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
.preset-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
