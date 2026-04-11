// src/types/presets.ts
import type { ISODateString } from './models';

/**
 * Identifies which geographic/thematic region a preset covers.
 * Used as the stable unique key for activePresetId tracking.
 */
export type PresetRegion =
  | 'california'
  | 'east-coast'
  | 'great-lakes'
  | 'texas'
  | 'southeast';

/**
 * Static definition of a Quick Start preset trip.
 * `startStadiumId` MUST match a `Stadium.id` value in stadiums.json.
 */
export interface QuickStartPreset {
  readonly id:             PresetRegion;
  readonly name:           string;
  readonly emoji:          string;
  readonly description:    string;
  readonly startStadiumId: string;
  readonly durationDays:   number;
}

/**
 * Payload emitted by QuickStartPresets when a preset is successfully applied.
 * F-04/F-05 will consume this to trigger route generation.
 */
export interface PresetAppliedEvent {
  readonly preset:        QuickStartPreset;
  readonly startDate:     ISODateString;
  readonly endDate:       ISODateString;
  readonly homeStadiumId: string;
}
