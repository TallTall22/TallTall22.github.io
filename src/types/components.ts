// src/types/components.ts
import type { ValidationResult, ISODateString, Stadium } from './models';

// ── StadiumSelector ───────────────────────────────────────────
export interface StadiumSelectorOption {
  label:   string;
  stadium: Stadium;
}

export interface StadiumSelectorProps {
  disabled?: boolean;
  label?:    string;
}

// ── DateRangePickerStart ──────────────────────────────────────
export interface DateRangePickerStartProps {
  modelValue: ISODateString | null;
  minDate:    ISODateString;
  disabled?:  boolean;
  label?:     string;
}
export interface DateRangePickerStartEmits {
  (e: 'update:modelValue', date: ISODateString | null): void;
}

// ── DateRangePickerEnd ────────────────────────────────────────
export interface DateRangePickerEndProps {
  modelValue: ISODateString | null;
  minDate:    ISODateString | null;
  maxDate:    ISODateString | null;
  disabled?:  boolean;
  label?:     string;
}
export interface DateRangePickerEndEmits {
  (e: 'update:modelValue', date: ISODateString | null): void;
}

// ── DateRangeValidationFeedback ───────────────────────────────
export interface DateRangeValidationFeedbackProps {
  result: ValidationResult;
}

// ── DateRangePicker (container) ───────────────────────────────
export interface DateRangePickerProps {
  readonly?: boolean;
}
export interface DateRangePickerEmits {
  (e: 'range-confirmed', range: { startDate: ISODateString; endDate: ISODateString }): void;
  (e: 'range-cleared'): void;
}
