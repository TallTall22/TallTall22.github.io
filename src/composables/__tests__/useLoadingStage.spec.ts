import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useLoadingStage } from '../useLoadingStage';

describe('useLoadingStage', () => {
  it('returns idle when both are false', () => {
    const { stage } = useLoadingStage(ref(false), ref(false));
    expect(stage.value).toBe('idle');
  });

  it('returns filtering when isFiltering is true', () => {
    const { stage } = useLoadingStage(ref(true), ref(false));
    expect(stage.value).toBe('filtering');
  });

  it('returns routing when isRouting is true (filtering false)', () => {
    const { stage } = useLoadingStage(ref(false), ref(true));
    expect(stage.value).toBe('routing');
  });

  it('filtering takes priority over routing when both true', () => {
    const { stage } = useLoadingStage(ref(true), ref(true));
    expect(stage.value).toBe('filtering');
  });

  it('isActive is false when idle', () => {
    const { isActive } = useLoadingStage(ref(false), ref(false));
    expect(isActive.value).toBe(false);
  });

  it('isActive is true when filtering', () => {
    const { isActive } = useLoadingStage(ref(true), ref(false));
    expect(isActive.value).toBe(true);
  });

  it('isActive is true when routing', () => {
    const { isActive } = useLoadingStage(ref(false), ref(true));
    expect(isActive.value).toBe(true);
  });

  it('stageLabel is empty string when idle', () => {
    const { stageLabel } = useLoadingStage(ref(false), ref(false));
    expect(stageLabel.value).toBe('');
  });

  it('stageLabel contains 篩選 when filtering', () => {
    const { stageLabel } = useLoadingStage(ref(true), ref(false));
    expect(stageLabel.value).toContain('篩選');
  });

  it('stageLabel contains 計算 when routing', () => {
    const { stageLabel } = useLoadingStage(ref(false), ref(true));
    expect(stageLabel.value).toContain('計算');
  });

  it('stage is reactive — updates when isFiltering changes', () => {
    const isFiltering = ref(false);
    const { stage } = useLoadingStage(isFiltering, ref(false));
    expect(stage.value).toBe('idle');
    isFiltering.value = true;
    expect(stage.value).toBe('filtering');
  });

  it('stage is reactive — updates when isRouting changes', () => {
    const isRouting = ref(false);
    const { stage } = useLoadingStage(ref(false), isRouting);
    expect(stage.value).toBe('idle');
    isRouting.value = true;
    expect(stage.value).toBe('routing');
  });
});
