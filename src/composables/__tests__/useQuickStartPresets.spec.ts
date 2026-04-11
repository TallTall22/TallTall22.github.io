// src/composables/__tests__/useQuickStartPresets.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { nextTick } from 'vue';
import { useQuickStartPresets } from '../useQuickStartPresets';
import { useTripStore } from '@/stores/tripStore';
import { QUICK_START_PRESETS } from '@/data/presets';
import { validateDateRange, todayISO, addDays } from '../useDateRange';
import { MAX_TRIP_DAYS } from '@/types';

// Fix system time for deterministic date assertions
const MOCK_TODAY = '2025-07-01';

describe('useQuickStartPresets', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${MOCK_TODAY}T12:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Data Integrity ───────────────────────────────────────────

  it('exposes exactly 5 presets', () => {
    const { presets } = useQuickStartPresets();
    expect(presets).toHaveLength(5);
  });

  it('all preset durationDays are less than MAX_TRIP_DAYS', () => {
    const { presets } = useQuickStartPresets();
    for (const preset of presets) {
      expect(preset.durationDays).toBeGreaterThan(0);
      expect(preset.durationDays).toBeLessThan(MAX_TRIP_DAYS);
    }
  });

  it('validateDateRange always valid for all 5 presets when applied today', () => {
    const { presets } = useQuickStartPresets();
    for (const preset of presets) {
      const today = todayISO();
      const end   = addDays(today, preset.durationDays);
      const result = validateDateRange(today, end);
      expect(result.valid).toBe(true);
    }
  });

  // ── applyPreset: California happy path ─────────────────────

  it('applyPreset sets homeStadiumId in store', async () => {
    const { applyPreset, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    const store = useTripStore();
    expect(store.homeStadiumId).toBe('LAD');
  });

  it('applyPreset sets startDate to todayISO()', async () => {
    const { applyPreset, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    const store = useTripStore();
    expect(store.startDate).toBe(MOCK_TODAY);
  });

  it('applyPreset sets endDate to addDays(today, durationDays)', async () => {
    const { applyPreset, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    const store = useTripStore();
    expect(store.endDate).toBe(addDays(MOCK_TODAY, 14));
  });

  it('applyPreset sets activePresetId to preset.id', async () => {
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    expect(activePresetId.value).toBe('california');
  });

  it('applyPreset sets showSnackbar to true', () => {
    const { applyPreset, showSnackbar, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    expect(showSnackbar.value).toBe(true);
  });

  it('applyPreset returns correct PresetAppliedEvent shape', () => {
    const { applyPreset, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    const event = applyPreset(california);
    expect(event.preset).toBe(california);
    expect(event.startDate).toBe(MOCK_TODAY);
    expect(event.endDate).toBe(addDays(MOCK_TODAY, 14));
    expect(event.homeStadiumId).toBe('LAD');
  });

  // ── Overwrite scenario ───────────────────────────────────────

  it('applyPreset overwrites previous store values when second preset applied', async () => {
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    const texas      = presets.find(p => p.id === 'texas')!;

    applyPreset(california);
    await nextTick();

    applyPreset(texas);
    const store = useTripStore();
    expect(store.homeStadiumId).toBe('TEX');
    expect(activePresetId.value).toBe('texas');
  });

  // ── Desync watcher ───────────────────────────────────────────

  it('activePresetId resets to null when store.startDate changes externally', async () => {
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    await nextTick(); // allow isApplyingPreset guard to clear

    const store = useTripStore();
    store.setStartDate('2025-09-01');
    await nextTick();

    expect(activePresetId.value).toBeNull();
  });

  it('activePresetId resets to null when store.endDate changes externally', async () => {
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    await nextTick();

    const store = useTripStore();
    store.setEndDate('2025-11-01');
    await nextTick();

    expect(activePresetId.value).toBeNull();
  });

  it('activePresetId resets to null when store.homeStadiumId changes externally', async () => {
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    await nextTick();

    const store = useTripStore();
    store.setHomeStadium('BOS');
    await nextTick();

    expect(activePresetId.value).toBeNull();
  });

  // ── isApplyingPreset guard (no premature desync) ─────────────

  it('activePresetId remains set immediately after applyPreset (no premature desync)', () => {
    // The guard must prevent watcher from clearing activePresetId during the synchronous writes
    const { applyPreset, activePresetId, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    // Synchronously check — before nextTick — activePresetId should still be set
    expect(activePresetId.value).toBe('california');
  });

  // ── Re-apply idempotency ─────────────────────────────────────

  it('applying same preset twice re-shows snackbar', async () => {
    const { applyPreset, showSnackbar, dismissSnackbar, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;

    applyPreset(california);
    expect(showSnackbar.value).toBe(true);

    dismissSnackbar();
    expect(showSnackbar.value).toBe(false); // dismissSnackbar directly sets the ref to false

    await nextTick();
    applyPreset(california);
    expect(showSnackbar.value).toBe(true);
  });

  // ── requestTripGeneration called ─────────────────────────────

  it('applyPreset calls store.requestTripGeneration()', () => {
    const { applyPreset, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    const store = useTripStore();
    const spy = vi.spyOn(store, 'requestTripGeneration');

    applyPreset(california);

    expect(spy).toHaveBeenCalledOnce();
  });

  // ── dismissSnackbar ──────────────────────────────────────────

  it('dismissSnackbar sets showSnackbar to false', () => {
    const { applyPreset, showSnackbar, dismissSnackbar, presets } = useQuickStartPresets();
    const california = presets.find(p => p.id === 'california')!;
    applyPreset(california);
    expect(showSnackbar.value).toBe(true);
    dismissSnackbar();
    expect(showSnackbar.value).toBe(false);
  });

  // ── QUICK_START_PRESETS exported ─────────────────────────────

  it('QUICK_START_PRESETS has exactly 5 entries with unique IDs', () => {
    const ids = QUICK_START_PRESETS.map(p => p.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });
});
