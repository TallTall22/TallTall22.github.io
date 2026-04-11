// src/data/__tests__/presets.spec.ts
import { describe, it, expect } from 'vitest';
import { QUICK_START_PRESETS } from '../presets';
import { MAX_TRIP_DAYS } from '@/types';
import stadiumsJson from '@/assets/data/stadiums.json';

describe('QUICK_START_PRESETS data integrity', () => {
  it('has exactly 5 entries', () => {
    expect(QUICK_START_PRESETS).toHaveLength(5);
  });

  it('all preset IDs are unique', () => {
    const ids = QUICK_START_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all preset names are non-empty strings', () => {
    for (const preset of QUICK_START_PRESETS) {
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });

  it('all preset emojis are non-empty strings', () => {
    for (const preset of QUICK_START_PRESETS) {
      expect(typeof preset.emoji).toBe('string');
      expect(preset.emoji.length).toBeGreaterThan(0);
    }
  });

  it('all preset durationDays are between 1 and MAX_TRIP_DAYS - 1', () => {
    for (const preset of QUICK_START_PRESETS) {
      expect(preset.durationDays).toBeGreaterThan(0);
      expect(preset.durationDays).toBeLessThan(MAX_TRIP_DAYS);
    }
  });

  it('all startStadiumIds match a Stadium.id in stadiums.json', () => {
    const stadiumIds = new Set((stadiumsJson as Array<{ id: string }>).map(s => s.id));
    for (const preset of QUICK_START_PRESETS) {
      expect(
        stadiumIds.has(preset.startStadiumId),
        `Preset "${preset.name}" startStadiumId "${preset.startStadiumId}" not found in stadiums.json`,
      ).toBe(true);
    }
  });

  it('no duplicate startStadiumIds across presets', () => {
    const stadiumIds = QUICK_START_PRESETS.map(p => p.startStadiumId);
    expect(new Set(stadiumIds).size).toBe(stadiumIds.length);
  });

  it('all preset descriptions are non-empty strings', () => {
    for (const preset of QUICK_START_PRESETS) {
      expect(typeof preset.description).toBe('string');
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });
});
