// src/components/control-panel/__tests__/TripActionBar.spec.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import TripActionBar from '../TripActionBar.vue';
import { useTripStore } from '@/stores/tripStore';
import { useMapStore } from '@/stores/mapStore';
import { useHighlightStore } from '@/stores/highlightStore';
import type { Trip } from '@/types';

// ── Fixture ──────────────────────────────────────────────────────────────────
const MOCK_TRIP: Trip = {
  tripId:        'action-bar-test-001',
  createdAt:     '2026-04-12',
  startDate:     '2026-04-12',
  endDate:       '2026-04-20',
  homeStadiumId: 'NYY',
  itinerary:     [],
  totalDistance: 200,
  qualityScore:  0.9,
};

// ── Browser API mocks (once per test run) ────────────────────────────────────
beforeAll(() => {
  // Vuetify VOverlay requires visualViewport
  if (!('visualViewport' in window)) {
    Object.defineProperty(window, 'visualViewport', {
      value: {
        addEventListener:    () => {},
        removeEventListener: () => {},
        dispatchEvent:       () => false,
        width:      1024,
        height:     768,
        offsetLeft: 0,
        offsetTop:  0,
        pageLeft:   0,
        pageTop:    0,
        scale:      1,
      },
      writable:     true,
      configurable: true,
    });
  }

  vi.spyOn(window, 'print').mockImplementation(() => {});
  // jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

  Object.defineProperty(navigator, 'clipboard', {
    value:        { writeText: vi.fn().mockResolvedValue(undefined) },
    writable:     true,
    configurable: true,
  });

  // location.search for useTripShare.restoreFromUrl (not called from TripActionBar)
  Object.defineProperty(window, 'location', {
    value:        { search: '', pathname: '/', href: 'http://localhost/' },
    writable:     true,
    configurable: true,
  });
});

// ── Test helpers ──────────────────────────────────────────────────────────────
let pinia: ReturnType<typeof createPinia>;

function makeVuetify() {
  return createVuetify({ components, directives });
}

function mountComponent(props: { isBusy?: boolean } = {}) {
  return mount(TripActionBar, {
    props,
    global: { plugins: [makeVuetify(), pinia] },
  });
}

/** Find a <button> whose visible text includes the given label. */
function findBtn(wrapper: ReturnType<typeof mountComponent>, label: string) {
  return wrapper.findAll('button').find(b => b.text().includes(label));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('TripActionBar', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders Reset, Export and Share buttons', () => {
    const wrapper = mountComponent();
    expect(findBtn(wrapper, '重新開始')).toBeDefined();
    expect(findBtn(wrapper, '匯出行程')).toBeDefined();
    expect(findBtn(wrapper, '分享行程')).toBeDefined();
  });

  // ── Disabled when no trip ────────────────────────────────────────────────

  it('Reset button is disabled when selectedTrip is null', () => {
    const wrapper = mountComponent();
    const btn = findBtn(wrapper, '重新開始');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  it('Export button is disabled when selectedTrip is null', () => {
    const wrapper = mountComponent();
    const btn = findBtn(wrapper, '匯出行程');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  it('Share button is disabled when selectedTrip is null', () => {
    const wrapper = mountComponent();
    const btn = findBtn(wrapper, '分享行程');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  // ── Disabled when isBusy ────────────────────────────────────────────────

  it('Reset button is disabled when isBusy is true, even with a trip', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent({ isBusy: true });
    const btn = findBtn(wrapper, '重新開始');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  it('Export button is disabled when isBusy is true', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent({ isBusy: true });
    const btn = findBtn(wrapper, '匯出行程');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  it('Share button is disabled when isBusy is true', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent({ isBusy: true });
    const btn = findBtn(wrapper, '分享行程');
    expect(btn?.attributes('disabled')).toBeDefined();
  });

  // ── Enabled when trip exists ─────────────────────────────────────────────

  it('Reset button is enabled when selectedTrip is not null', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent();
    const btn = findBtn(wrapper, '重新開始');
    expect(btn?.attributes('disabled')).toBeUndefined();
  });

  it('Share button is enabled when selectedTrip is not null', () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent();
    const btn = findBtn(wrapper, '分享行程');
    expect(btn?.attributes('disabled')).toBeUndefined();
  });

  // ── Reset handler ────────────────────────────────────────────────────────

  it('clicking Reset calls tripStore.reset()', async () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);
    const resetSpy = vi.spyOn(tripStore, 'reset');

    const wrapper = mountComponent();
    await findBtn(wrapper, '重新開始')!.trigger('click');

    expect(resetSpy).toHaveBeenCalledOnce();
  });

  it('clicking Reset calls mapStore.reset()', async () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);
    const mapStore = useMapStore();
    const mapResetSpy = vi.spyOn(mapStore, 'reset');

    const wrapper = mountComponent();
    await findBtn(wrapper, '重新開始')!.trigger('click');

    expect(mapResetSpy).toHaveBeenCalledOnce();
  });

  it('clicking Reset calls highlightStore.clearHovered()', async () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);
    const highlightStore = useHighlightStore();
    const clearSpy = vi.spyOn(highlightStore, 'clearHovered');

    const wrapper = mountComponent();
    await findBtn(wrapper, '重新開始')!.trigger('click');

    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it('clicking Reset clears selectedTrip in tripStore', async () => {
    const tripStore = useTripStore();
    tripStore.setSelectedTrip(MOCK_TRIP);

    const wrapper = mountComponent();
    await findBtn(wrapper, '重新開始')!.trigger('click');

    expect(tripStore.selectedTrip).toBeNull();
  });

  it('clicking Reset resets all three stores in one click', async () => {
    const tripStore      = useTripStore();
    const mapStore       = useMapStore();
    const highlightStore = useHighlightStore();

    tripStore.setSelectedTrip(MOCK_TRIP);
    tripStore.setStartDate('2026-04-12');
    mapStore.setZoom(8);
    highlightStore.setHovered('NYY');

    const wrapper = mountComponent();
    await findBtn(wrapper, '重新開始')!.trigger('click');

    expect(tripStore.selectedTrip).toBeNull();
    expect(mapStore.zoom).toBe(4);
    expect(highlightStore.hoveredStadiumId).toBeNull();
  });
});
