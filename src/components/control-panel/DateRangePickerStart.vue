<script setup lang="ts">
import { ref } from 'vue';
import type { ISODateString } from '@/types';

const props = defineProps<{
  modelValue: ISODateString | null;
  minDate:    ISODateString;
  disabled?:  boolean;
  label?:     string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', date: ISODateString | null): void;
}>();

const menuOpen = ref(false);

function normalizeDate(val: Date | string | null | undefined): ISODateString | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val.slice(0, 10);
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function onDateSelected(val: Date | string | null | undefined): void {
  emit('update:modelValue', normalizeDate(val));
  menuOpen.value = false;
}
</script>

<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="props.modelValue"
        :label="props.label ?? '開始日期'"
        :disabled="props.disabled"
        prepend-inner-icon="mdi-calendar-start"
        readonly
        clearable
        @click:clear="emit('update:modelValue', null)"
      />
    </template>
    <v-date-picker
      :model-value="props.modelValue"
      :min="props.minDate"
      color="primary"
      @update:model-value="onDateSelected"
    />
  </v-menu>
</template>
