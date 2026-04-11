// src/composables/__tests__/useStadiumSelector.spec.ts
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import { useStadiumSelector } from '../useStadiumSelector';
import { loadStadiums } from '@/services/stadiumService';
import type { Stadium, StadiumLoadResult } from '@/types/models';

// ── Module mock ──────────────────────────────────────────────────────────────

vi.mock('@/services/stadiumService', () => ({
  loadStadiums: vi.fn(),
}));

// ── Polyfills ────────────────────────────────────────────────────────────────

beforeAll(() => {
  if (!window.visualViewport) {
    Object.defineProperty(window, 'visualViewport', {
      value: { width: 1024, height: 768, addEventListener: () => {}, removeEventListener: () => {} },
      configurable: true,
    });
  }
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeStadium(overrides: Partial<Stadium> = {}): Stadium {
  return {
    id: 'NYY',
    teamId: '147',
    teamName: 'New York Yankees',
    teamNickname: 'Yankees',
    league: 'AL',
    division: 'ALE',
    stadiumName: 'Yankee Stadium',
    city: 'Bronx',
    state: 'NY',
    coordinates: { lat: 40.829, lng: -73.926 },
    timeZone: 'America/New_York',
    logoUrl: 'https://www.mlbstatic.com/team-logos/147.svg',
    stadiumPhotoUrl: '/images/stadiums/NYY.jpg',
    ...overrides,
  };
}

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountComposable() {
  const Wrapper = defineComponent({
    setup() { return useStadiumSelector(); },
    template: '<div />',
  });
  return mount(Wrapper);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStadiumSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [], error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state (before mount resolves) ────────────────────────────────────

  describe('initial state', () => {
    it('options is empty before mount resolves', () => {
      let resolveLoad!: (v: StadiumLoadResult) => void;
      vi.mocked(loadStadiums).mockReturnValue(
        new Promise<StadiumLoadResult>((res) => { resolveLoad = res; }),
      );
      const wrapper = mountComposable();
      expect(wrapper.vm.options).toHaveLength(0);
      resolveLoad({ stadiums: [], error: null });
    });

    it('loadError is null before mount resolves', () => {
      let resolveLoad!: (v: StadiumLoadResult) => void;
      vi.mocked(loadStadiums).mockReturnValue(
        new Promise<StadiumLoadResult>((res) => { resolveLoad = res; }),
      );
      const wrapper = mountComposable();
      expect(wrapper.vm.loadError).toBeNull();
      resolveLoad({ stadiums: [], error: null });
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────────────

  it('isLoading is true while fetch is pending', async () => {
    let resolveLoad!: (v: StadiumLoadResult) => void;
    vi.mocked(loadStadiums).mockReturnValue(
      new Promise<StadiumLoadResult>((res) => { resolveLoad = res; }),
    );
    const wrapper = mountComposable();
    await nextTick(); // allow onMounted to fire and set isLoading = true
    expect(wrapper.vm.isLoading).toBe(true);
    resolveLoad({ stadiums: [], error: null });
    await flushPromises();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  // ── Happy path ────────────────────────────────────────────────────────────────

  it('populates options and clears isLoading on successful load', async () => {
    const stadium = makeStadium();
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [stadium], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    expect(wrapper.vm.stadiums).toHaveLength(1);
    expect(wrapper.vm.options[0].label).toBe('New York Yankees — Yankee Stadium (Bronx)');
    expect(wrapper.vm.isLoading).toBe(false);
    expect(wrapper.vm.loadError).toBeNull();
  });

  // ── Error paths ───────────────────────────────────────────────────────────────

  it('sets loadError=FETCH_FAILED and leaves stadiums empty', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [], error: 'FETCH_FAILED' });
    const wrapper = mountComposable();
    await flushPromises();
    expect(wrapper.vm.loadError).toBe('FETCH_FAILED');
    expect(wrapper.vm.stadiums).toHaveLength(0);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('sets loadError=PARSE_ERROR and leaves stadiums empty', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [], error: 'PARSE_ERROR' });
    const wrapper = mountComposable();
    await flushPromises();
    expect(wrapper.vm.loadError).toBe('PARSE_ERROR');
    expect(wrapper.vm.stadiums).toHaveLength(0);
  });

  it('sets loadError=EMPTY_DATA and leaves stadiums empty', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [], error: 'EMPTY_DATA' });
    const wrapper = mountComposable();
    await flushPromises();
    expect(wrapper.vm.loadError).toBe('EMPTY_DATA');
    expect(wrapper.vm.stadiums).toHaveLength(0);
  });

  // ── selectedOption computed ───────────────────────────────────────────────────

  it('selectedOption is null when no homeStadiumId is set', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [makeStadium()], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    expect(wrapper.vm.selectedOption).toBeNull();
  });

  it('selectedOption reflects store homeStadiumId after onSelect', async () => {
    const stadium = makeStadium();
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [stadium], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.selectedOption?.stadium.id).toBe('NYY');
  });

  it('selectedOption returns null when homeStadiumId does not match any stadium', async () => {
    const stadium = makeStadium({ id: 'BOS' });
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [stadium], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    wrapper.vm.onSelect({ label: 'other', stadium: makeStadium({ id: 'ATL' }) });
    expect(wrapper.vm.selectedOption).toBeNull();
  });

  // ── onSelect ──────────────────────────────────────────────────────────────────

  it('onSelect sets homeStadiumId to option.stadium.id', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [makeStadium()], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.homeStadiumId).toBe('NYY');
  });

  it('onSelect(null) clears homeStadiumId', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [makeStadium()], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.homeStadiumId).toBe('NYY');
    wrapper.vm.onSelect(null);
    expect(wrapper.vm.homeStadiumId).toBeNull();
  });

  // ── onClear ───────────────────────────────────────────────────────────────────

  it('onClear resets homeStadiumId to null', async () => {
    vi.mocked(loadStadiums).mockResolvedValue({ stadiums: [makeStadium()], error: null });
    const wrapper = mountComposable();
    await flushPromises();
    wrapper.vm.onSelect(wrapper.vm.options[0]);
    expect(wrapper.vm.homeStadiumId).toBe('NYY');
    wrapper.vm.onClear();
    expect(wrapper.vm.homeStadiumId).toBeNull();
  });

  // ── Unmount guard ─────────────────────────────────────────────────────────────

  it('unmount guard: late-resolving promise does not write to refs after unmount', async () => {
    let resolveLoad!: (v: StadiumLoadResult) => void;
    vi.mocked(loadStadiums).mockReturnValue(
      new Promise<StadiumLoadResult>((res) => { resolveLoad = res; }),
    );

    const wrapper = mountComposable();
    await nextTick(); // onMounted fires, isLoading = true, awaiting loadStadiums

    wrapper.unmount(); // triggers onBeforeUnmount → isMounted = false

    // Resolve after unmount — guard should prevent refs from being written
    resolveLoad({ stadiums: [makeStadium()], error: null });
    await flushPromises();

    // Component instance refs still reflect pre-unmount state (empty)
    expect(wrapper.vm.stadiums).toHaveLength(0);
    expect(wrapper.vm.loadError).toBeNull();
  });
});
