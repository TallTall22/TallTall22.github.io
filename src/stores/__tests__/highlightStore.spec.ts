// src/stores/__tests__/highlightStore.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useHighlightStore } from '../highlightStore';

describe('highlightStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initial state is null', () => {
    const store = useHighlightStore();
    expect(store.hoveredStadiumId).toBeNull();
  });

  it('setHovered updates hoveredStadiumId', () => {
    const store = useHighlightStore();
    store.setHovered('NYY');
    expect(store.hoveredStadiumId).toBe('NYY');
  });

  it('clearHovered resets hoveredStadiumId to null', () => {
    const store = useHighlightStore();
    store.setHovered('NYY');
    store.clearHovered();
    expect(store.hoveredStadiumId).toBeNull();
  });

  it('reset() restores initial state', () => {
    const store = useHighlightStore();
    store.setHovered('BOS');
    store.reset();
    expect(store.hoveredStadiumId).toBeNull();
  });

  it('setHovered overwrites a previous value', () => {
    const store = useHighlightStore();
    store.setHovered('NYY');
    store.setHovered('BOS');
    expect(store.hoveredStadiumId).toBe('BOS');
  });
});
