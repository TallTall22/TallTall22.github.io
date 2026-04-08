// src/composables/__tests__/useStadiumSelector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { useStadiumSelector } from '../useStadiumSelector';
import * as stadiumService from '@/services/stadiumService';
import type { Stadium } from '@/types/models';

// Minimal stub stadium for testing
const stubStadium: Stadium = {
  id: 'NYY',
  teamId: '147',
  teamName: 'New York Yankees',
  teamNickname: 'Yankees',
  stadiumName: 'Yankee Stadium',
  city: 'Bronx',
  state: 'NY',
  coordinates: { lat: 40.8296, lng: -73.9262 },
  timeZone: 'America/New_York',
  league: 'AL',
  division: 'ALE',
  logoUrl: 'https://www.mlbstatic.com/team-logos/147.svg',
  stadiumPhotoUrl: '/images/stadiums/NYY.jpg',
};

// Helper: mount a component that uses the composable
function mountWithComposable() {
  const Wrapper = defineComponent({
    setup() { return useStadiumSelector(); },
    template: '<div />',
  });
  return mount(Wrapper, { global: { plugins: [createPinia()] } });
}

describe('useStadiumSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads stadiums on mount and populates options', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [stubStadium],
      error: null,
    });
    const wrapper = mountWithComposable();
    await nextTick();
    await nextTick(); // wait for async onMounted
    expect(wrapper.vm.stadiums).toHaveLength(1);
    expect(wrapper.vm.options[0].label).toBe('New York Yankees — Yankee Stadium (Bronx)');
    expect(wrapper.vm.loadError).toBeNull();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('sets loadError when service fails', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [],
      error: 'FETCH_FAILED',
    });
    const wrapper = mountWithComposable();
    await nextTick();
    await nextTick();
    expect(wrapper.vm.loadError).toBe('FETCH_FAILED');
    expect(wrapper.vm.stadiums).toHaveLength(0);
  });

  it('onSelect sets homeStadiumId in store', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [stubStadium],
      error: null,
    });
    const wrapper = mountWithComposable();
    await nextTick(); await nextTick();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.homeStadiumId).toBe('NYY');
  });

  it('onClear resets homeStadiumId to null', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [stubStadium],
      error: null,
    });
    const wrapper = mountWithComposable();
    await nextTick(); await nextTick();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    wrapper.vm.onClear();
    expect(wrapper.vm.homeStadiumId).toBeNull();
  });

  it('selectedOption returns null when no stadium is selected', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [stubStadium],
      error: null,
    });
    const wrapper = mountWithComposable();
    await nextTick(); await nextTick();
    expect(wrapper.vm.selectedOption).toBeNull();
  });

  it('selectedOption returns correct option after selection', async () => {
    vi.spyOn(stadiumService, 'loadStadiums').mockResolvedValue({
      stadiums: [stubStadium],
      error: null,
    });
    const wrapper = mountWithComposable();
    await nextTick(); await nextTick();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.selectedOption?.stadium.id).toBe('NYY');
  });

  it('isLoading is true during fetch and false after', async () => {
    let resolve!: (v: Awaited<ReturnType<typeof stadiumService.loadStadiums>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof stadiumService.loadStadiums>>>(
      (res) => { resolve = res; }
    );
    vi.spyOn(stadiumService, 'loadStadiums').mockReturnValue(pending);

    const wrapper = mountWithComposable();
    await nextTick();
    expect(wrapper.vm.isLoading).toBe(true);

    resolve({ stadiums: [stubStadium], error: null });
    await nextTick(); await nextTick();
    expect(wrapper.vm.isLoading).toBe(false);
  });
});
