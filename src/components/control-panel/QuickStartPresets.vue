<script setup lang="ts">
import type { QuickStartPresetsProps, QuickStartPresetsEmits } from '@/types/components';
import type { QuickStartPreset } from '@/types/presets';
import { useQuickStartPresets } from '@/composables/useQuickStartPresets';
import PresetButtonGroup from './PresetButtonGroup.vue';

withDefaults(defineProps<QuickStartPresetsProps>(), {
  disabled: false,
});

const emit = defineEmits<QuickStartPresetsEmits>();

const {
  presets,
  activePresetId,
  confirmationMessage,
  showSnackbar,
  applyPreset,
  dismissSnackbar,
  isTripGenerating,
} = useQuickStartPresets();

function handlePresetSelected(preset: QuickStartPreset): void {
  const event = applyPreset(preset);
  emit('preset-applied', event);
}
</script>

<template>
  <v-card variant="outlined" class="quick-start-presets">
    <v-card-title class="text-primary pb-1">
      <v-icon icon="mdi-lightning-bolt" size="small" class="mr-1" />
      快速行程推薦
    </v-card-title>
    <v-card-subtitle class="mb-3">
      一鍵填入預設行程日期與起點球場
    </v-card-subtitle>

    <v-card-text class="pt-0">
      <PresetButtonGroup
        :presets="presets"
        :active-preset-id="activePresetId"
        :disabled="disabled || isTripGenerating"
        @preset-selected="handlePresetSelected"
      />
    </v-card-text>

    <v-snackbar
      v-model="showSnackbar"
      :timeout="3000"
      color="success"
      location="bottom"
    >
      {{ confirmationMessage }}
      <template #actions>
        <v-btn
          variant="text"
          size="small"
          @click="dismissSnackbar"
        >
          關閉
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<style scoped>
.quick-start-presets {
  border-color: rgba(0, 45, 114, 0.2);
}
</style>
