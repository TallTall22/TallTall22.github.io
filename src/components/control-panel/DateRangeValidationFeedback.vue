<script setup lang="ts">
import type { DateRangeValidationFeedbackProps } from '@/types/components';

const props = withDefaults(defineProps<DateRangeValidationFeedbackProps>(), {
  hasUserInput: false,
});
</script>

<template>
  <div>
    <v-alert
      v-if="props.hasUserInput && props.result.error && props.result.message"
      type="error"
      density="compact"
      variant="tonal"
      class="mt-2"
    >
      {{ props.result.message }}
    </v-alert>
    <v-chip
      v-else-if="props.result.valid && props.result.dayCount > 0"
      color="success"
      size="small"
      class="mt-2"
    >
      ✓ {{ props.result.dayCount }} 天的旅程
    </v-chip>
  </div>
</template>
