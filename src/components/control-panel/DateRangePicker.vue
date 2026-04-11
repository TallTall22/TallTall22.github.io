<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import DateRangePickerStart from './DateRangePickerStart.vue';
import DateRangePickerEnd from './DateRangePickerEnd.vue';
import DateRangeValidationFeedback from './DateRangeValidationFeedback.vue';
import { useDateRange } from '@/composables/useDateRange';
import type { ISODateString } from '@/types';

const emit = defineEmits<{
  (e: 'range-confirmed', range: { startDate: ISODateString; endDate: ISODateString }): void;
}>();

const hasUserInput = ref(false);

const {
  startDate,
  endDate,
  today,
  maxEndDate,
  validation,
  onStartDateChange,
  onEndDateChange,
} = useDateRange();

const endDateHasError = computed(() =>
  validation.value.error !== null &&
  (validation.value.error === 'END_BEFORE_START' ||
   validation.value.error === 'EXCEEDS_MAX_DAYS')
);

// Vue 3 auto-stops watch() registered in setup() on unmount.
watch(validation, (val) => {
  if (val.valid && startDate.value && endDate.value) {
    hasUserInput.value = true;
    emit('range-confirmed', {
      startDate: startDate.value,
      endDate: endDate.value,
    });
  }
});

function handleStartDateChange(date: ISODateString | null): void {
  hasUserInput.value = true;
  onStartDateChange(date);
}

function handleEndDateChange(date: ISODateString | null): void {
  hasUserInput.value = true;
  onEndDateChange(date);
}
</script>

<template>
  <v-card variant="outlined" class="pa-4">
    <v-card-title class="text-primary">
      <v-icon class="mr-2">mdi-calendar-range</v-icon>
      選擇旅遊日期
    </v-card-title>

    <v-row align="center" class="mt-2">
      <v-col cols="12" sm="5">
        <DateRangePickerStart
          :model-value="startDate"
          :min-date="today"
          @update:model-value="handleStartDateChange"
        />
      </v-col>

      <v-col cols="12" sm="2" class="text-center">
        <v-icon color="primary">mdi-arrow-right</v-icon>
      </v-col>

      <v-col cols="12" sm="5">
        <DateRangePickerEnd
          :model-value="endDate"
          :min-date="startDate"
          :max-date="maxEndDate"
          :has-error="endDateHasError"
          :error-msg="validation.message"
          @update:model-value="handleEndDateChange"
        />
      </v-col>
    </v-row>

    <DateRangeValidationFeedback :result="validation" :has-user-input="hasUserInput" />
  </v-card>
</template>
