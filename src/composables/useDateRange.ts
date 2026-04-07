// src/composables/useDateRange.ts
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTripStore } from '@/stores/tripStore';
import type { ValidationResult, ISODateString } from '@/types';
import { MAX_TRIP_DAYS } from '@/types';

// ── Pure helpers (exported for unit testing) ─────────────────────────────────

export function toDate(iso: ISODateString): Date {
  return new Date(iso + 'T00:00:00');
}

export function todayISO(): ISODateString {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: ISODateString, days: number): ISODateString {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: ISODateString, to: ISODateString): number {
  return Math.round(
    (toDate(to).getTime() - toDate(from).getTime()) / 86_400_000
  );
}

// ── Validation pure function ─────────────────────────────────────────────────

export function validateDateRange(
  startDate: ISODateString | null,
  endDate:   ISODateString | null,
): ValidationResult {
  const today = todayISO();

  if (!startDate) {
    return { valid: false, error: 'MISSING_START', dayCount: 0, message: '請選擇開始日期' };
  }
  if (startDate < today) {
    return { valid: false, error: 'START_IN_PAST', dayCount: 0, message: '開始日期不能是過去日期' };
  }
  if (!endDate) {
    return { valid: false, error: 'MISSING_END', dayCount: 0, message: '請選擇結束日期' };
  }
  if (endDate < startDate) {
    return { valid: false, error: 'END_BEFORE_START', dayCount: 0, message: '結束日期必須晚於或等於開始日期' };
  }
  const days = diffDays(startDate, endDate);
  if (days > MAX_TRIP_DAYS) {
    return {
      valid: false,
      error: 'EXCEEDS_MAX_DAYS',
      dayCount: days,
      message: `旅程不可超過 ${MAX_TRIP_DAYS} 天 (目前: ${days} 天)`,
    };
  }
  return { valid: true, error: null, dayCount: days, message: null };
}

// ── Composable ───────────────────────────────────────────────────────────────

export function useDateRange() {
  const store = useTripStore();
  const { startDate, endDate } = storeToRefs(store);

  const today = computed(() => todayISO());

  const maxEndDate = computed<ISODateString | null>(() =>
    startDate.value ? addDays(startDate.value, MAX_TRIP_DAYS) : null
  );

  const validation = computed<ValidationResult>(() =>
    validateDateRange(startDate.value, endDate.value)
  );

  function onStartDateChange(date: ISODateString | null): void {
    store.setStartDate(date);
  }

  function onEndDateChange(date: ISODateString | null): void {
    if (date === null) { store.setEndDate(null); return; }
    const result = validateDateRange(startDate.value, date);
    if (result.valid || result.error === 'MISSING_END') {
      store.setEndDate(date);
    }
  }

  function clearDates(): void {
    store.clearDates();
  }

  return {
    startDate,
    endDate,
    today,
    maxEndDate,
    validation,
    onStartDateChange,
    onEndDateChange,
    clearDates,
  };
}
