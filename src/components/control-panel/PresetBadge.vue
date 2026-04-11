<script setup lang="ts">
import type { PresetBadgeProps, PresetBadgeEmits } from '@/types/components';

const props = withDefaults(defineProps<PresetBadgeProps>(), {
  isActive: false,
  disabled: false,
});

const emit = defineEmits<PresetBadgeEmits>();

function handleClick(): void {
  if (props.disabled) return;
  emit('select', props.preset);
}
</script>

<template>
  <v-btn
    :variant="isActive ? 'flat' : 'outlined'"
    :color="isActive ? 'primary' : undefined"
    :disabled="disabled"
    rounded="lg"
    size="small"
    class="preset-badge"
    :aria-label="`套用 ${preset.name} 預設行程，共 ${preset.durationDays} 天`"
    :aria-pressed="isActive"
    @click="handleClick"
  >
    <span class="preset-emoji mr-1" aria-hidden="true">{{ preset.emoji }}</span>
    <span class="preset-name">{{ preset.name }}</span>
    <span class="preset-days ml-1">{{ preset.durationDays }}天</span>
  </v-btn>
</template>

<style scoped>
.preset-badge {
  text-transform: none;
  letter-spacing: 0;
}
.preset-emoji {
  font-size: 1rem;
  line-height: 1;
}
.preset-days {
  font-size: 0.75rem;
  opacity: 0.75;
  font-weight: 400;
}
</style>
