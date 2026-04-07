<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ISODateString } from '@/types';

const props = defineProps<{
  modelValue: ISODateString | null;
  minDate:    ISODateString | null;
  maxDate:    ISODateString | null;
  disabled?:  boolean;
  label?:     string;
  hasError?:  boolean;
  errorMsg?:  string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', date: ISODateString | null): void;
}>();

const menuOpen = ref(false);

const isDisabled = computed(() => props.disabled === true || props.minDate === null);

function normalizeDate(val: Date | string | null | undefined): ISODateString | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  return val.toISOString().slice(0, 10);
}

function onDateSelected(val: Date | string | null | undefined): void {
  emit('update:modelValue', normalizeDate(val));
  menuOpen.value = false;
}
</script>

<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false" :disabled="isDisabled">
    <template #activator="{ props: menuProps }">
      <v-tooltip
        :text="isDisabled ? '請先選擇開始日期' : ''"
        :disabled="!isDisabled"
      >
        <template #activator="{ props: tooltipProps }">
          <v-text-field
            v-bind="{ ...menuProps, ...tooltipProps }"
            :model-value="props.modelValue"
            :label="props.label ?? '結束日期'"
            :disabled="isDisabled"
            :error="props.hasError"
            :error-messages="props.hasError && props.errorMsg ? [props.errorMsg] : []"
            prepend-inner-icon="mdi-calendar-end"
            readonly
            clearable
            @click:clear="emit('update:modelValue', null)"
          />
        </template>
      </v-tooltip>
    </template>
    <v-date-picker
      :model-value="props.modelValue"
      :min="props.minDate ?? undefined"
      :max="props.maxDate ?? undefined"
      color="primary"
      @update:model-value="onDateSelected"
    />
  </v-menu>
</template>
