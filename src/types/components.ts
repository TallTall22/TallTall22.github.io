// src/types/components.ts
import type { ValidationResult, ISODateString, Stadium } from './models';
import type { QuickStartPreset, PresetAppliedEvent, PresetRegion } from './presets';

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
}

// ── F-03: Quick Start Presets ─────────────────────────────────

// ── PresetBadge (Atom) ────────────────────────────────────────
export interface PresetBadgeProps {
  preset:    QuickStartPreset;
  isActive?: boolean;
  disabled?: boolean;
}
export interface PresetBadgeEmits {
  (e: 'select', preset: QuickStartPreset): void;
}

// ── PresetButtonGroup (Molecule) ──────────────────────────────
export interface PresetButtonGroupProps {
  presets:         readonly QuickStartPreset[];
  activePresetId?: PresetRegion | null;
  disabled?:       boolean;
}
export interface PresetButtonGroupEmits {
  (e: 'preset-selected', preset: QuickStartPreset): void;
}

// ── QuickStartPresets (Organism) ──────────────────────────────
export interface QuickStartPresetsProps {
  disabled?: boolean;
}
export interface QuickStartPresetsEmits {
  (e: 'preset-applied', event: PresetAppliedEvent): void;
}
