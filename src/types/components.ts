// src/types/components.ts
import type { ValidationResult, ISODateString, Stadium } from './models';
import type { QuickStartPreset, PresetAppliedEvent, PresetRegion } from './presets';
import type { MapPolylineSegment, StadiumMarkerData } from './map';

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
  hasError?:  boolean;
  errorMsg?:  string | null;
}
export interface DateRangePickerEndEmits {
  (e: 'update:modelValue', date: ISODateString | null): void;
}

// ── DateRangeValidationFeedback ───────────────────────────────
export interface DateRangeValidationFeedbackProps {
  result:        ValidationResult;
  hasUserInput?: boolean;
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

// ── F-06: Map View ────────────────────────────────────────────

export interface MapViewProps {
  isLoading?: boolean;
  hasError?:  boolean;
  errorMsg?:  string | null;
}

// ── F-06: Map Polyline Layer ──────────────────────────────────────
export interface MapPolylineLayerProps {
  segments: MapPolylineSegment[];
}

// ── F-07: Map Marker Layer ────────────────────────────────────────
export interface MapMarkerLayerProps {
  markers: StadiumMarkerData[];
}

// ── F-08: Timeline ────────────────────────────────────────────────────────────

export interface TimelineDayViewModel {
  /** 1-based day number in the itinerary */
  dayNumber:        number;
  /** ISO date string "YYYY-MM-DD" */
  date:             string;
  /** Day-of-week label derived from date, e.g. "Mon", "Tue" */
  dayOfWeek:        string;
  /** Discriminated type — drives card variant rendering */
  type:             'game_day' | 'travel_day';
  /** "Away Nickname @ Home Nickname" — null for travel days */
  matchupLabel:     string | null;
  /** "7:05 PM ET" — null for travel days */
  localTime:        string | null;
  /** IANA timezone abbreviation only, e.g. "ET", "CT" — null for travel days */
  timeZoneAbbr:     string | null;
  /** Stadium display name — null for travel days without stadiumId */
  stadiumName:      string | null;
  /** City name — null for travel days without stadiumId */
  city:             string | null;
  /** logoUrl of home team — empty string if not resolved */
  homeTeamLogo:     string;
  /** logoUrl of away team — empty string if not resolved */
  awayTeamLogo:     string;
  /** Home team nickname — null for travel days */
  homeTeamNickname: string | null;
  /** Away team nickname — null for travel days */
  awayTeamNickname: string | null;
  /** Distance from previous day in km — optional, from TripDayBase.distanceFromPrevious */
  distanceKm:       number | null;
}

// ── F-08: Timeline Component Props ───────────────────────────────────────────

export interface TripTimelineCardProps {
  day:       TimelineDayViewModel;
  /** Reserved for future click-to-highlight; defaults false */
  isActive?: boolean;
}

/** TripTimelineStrip reads from useTimeline composable directly (Organism pattern) */
export interface TripTimelineStripProps {
  // intentionally empty — Organism reads composable, not props
}

