// src/components/timeline/__tests__/TripTimelineStrip.spec.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';

// Mock the composable BEFORE importing the component (Vitest hoisting)
vi.mock('@/composables/useTimeline', () => ({
  useTimeline: vi.fn(),
}));

import TripTimelineStrip from '../TripTimelineStrip.vue';
import { useTimeline } from '@/composables/useTimeline';
import { useHighlightStore } from '@/stores/highlightStore';
import type { TimelineDayViewModel } from '@/types/components';

// Polyfill visualViewport — Vuetify's VOverlay uses this API which jsdom lacks.
beforeAll(() => {
  if (!('visualViewport' in window)) {
    Object.defineProperty(window, 'visualViewport', {
      value: {
        addEventListener:    () => {},
        removeEventListener: () => {},
        dispatchEvent:       () => false,
        width:    (window as Window).innerWidth  ?? 1024,
        height:   (window as Window).innerHeight ?? 768,
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
});

const vuetify = createVuetify({ components, directives });

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function getMountOpts() {
  return { global: { plugins: [vuetify, pinia] } };
}

// Legacy mountOpts — no longer needed since all tests use getMountOpts()

function makeGameDayVM(dayNumber: number): TimelineDayViewModel {
  return {
    dayNumber,
    date:             `2026-04-${String(dayNumber).padStart(2, '0')}`,
    dayOfWeek:        'Mon',
    type:             'game_day',
    matchupLabel:     'Red Sox @ Yankees',
    localTime:        '7:05 PM EDT',
    timeZoneAbbr:     'EDT',
    stadiumName:      'Yankee Stadium',
    city:             'New York',
    homeTeamLogo:     '',
    awayTeamLogo:     '',
    homeTeamNickname: 'Yankees',
    awayTeamNickname: 'Red Sox',
    distanceKm:       null,
    stadiumId:        'NYY',
  };
}

// Helper to set up the mock composable return value
function mockUseTimeline(overrides: {
  timelineDays?: TimelineDayViewModel[];
  isLoading?: boolean;
  error?: string | null;
}): void {
  vi.mocked(useTimeline).mockReturnValue({
    timelineDays: ref(overrides.timelineDays ?? []),
    isLoading:    ref(overrides.isLoading ?? false),
    error:        ref(overrides.error ?? null),
  });
}

describe('TripTimelineStrip', () => {
  it('renders empty state placeholder when timelineDays is empty and not loading', () => {
    mockUseTimeline({ timelineDays: [], isLoading: false, error: null });
    const wrapper = mount(TripTimelineStrip, getMountOpts());
    expect(wrapper.text()).toContain('Generate a trip');
  });

  it('renders loading state when isLoading is true', () => {
    mockUseTimeline({ timelineDays: [], isLoading: true, error: null });
    const wrapper = mount(TripTimelineStrip, getMountOpts());
    // TimelineSkeletonStrip renders 8 skeleton cards when loading
    expect(wrapper.find('[data-testid="timeline-skeleton-strip"]').exists()).toBe(true);
    expect(wrapper.findAll('.skeleton-card')).toHaveLength(8);
  });

  it('renders error alert when error is set', () => {
    mockUseTimeline({ timelineDays: [], isLoading: false, error: 'Stadium data unavailable. Please refresh.' });
    const wrapper = mount(TripTimelineStrip, getMountOpts());
    expect(wrapper.text()).toContain('Stadium data unavailable');
  });

  it('renders N cards matching timelineDays.length', () => {
    const days = [makeGameDayVM(1), makeGameDayVM(2), makeGameDayVM(3)];
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });
    const wrapper = mount(TripTimelineStrip, getMountOpts());
    const cards = wrapper.findAllComponents({ name: 'TripTimelineCard' });
    expect(cards).toHaveLength(3);
  });

  it('applies horizontal scroll container', () => {
    const days = [makeGameDayVM(1)];
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });
    const wrapper = mount(TripTimelineStrip, getMountOpts());
    const scrollArea = wrapper.find('[data-testid="timeline-scroll-area"]');
    expect(scrollArea.exists()).toBe(true);
  });

  // ── F-09: hover interaction tests ──────────────────────────────────────────

  it('calls highlightStore.setHovered when mouseenter on card with stadiumId', async () => {
    const days = [makeGameDayVM(1)]; // stadiumId: 'NYY'
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });

    const wrapper = mount(TripTimelineStrip, getMountOpts());
    const cardItem = wrapper.find('.timeline-card-item');
    expect(cardItem.exists()).toBe(true);

    await cardItem.trigger('mouseenter');

    const store = useHighlightStore();
    expect(store.hoveredStadiumId).toBe('NYY');
  });

  it('calls highlightStore.clearHovered when mouseleave from card', async () => {
    const days = [makeGameDayVM(1)];
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });

    const wrapper = mount(TripTimelineStrip, getMountOpts());
    const store   = useHighlightStore();

    const cardItem = wrapper.find('.timeline-card-item');
    await cardItem.trigger('mouseenter');
    expect(store.hoveredStadiumId).toBe('NYY');

    await cardItem.trigger('mouseleave');
    expect(store.hoveredStadiumId).toBeNull();
  });

  it('passes isActive=true to TripTimelineCard when hoveredStadiumId matches', async () => {
    const days = [makeGameDayVM(1)]; // stadiumId: 'NYY'
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });

    const wrapper = mount(TripTimelineStrip, getMountOpts());

    // Set hovered state on the store directly
    const store = useHighlightStore();
    store.setHovered('NYY');
    await wrapper.vm.$nextTick();

    const card = wrapper.findComponent({ name: 'TripTimelineCard' });
    expect(card.props('isActive')).toBe(true);
  });

  it('passes isActive=false to TripTimelineCard when hoveredStadiumId does not match', async () => {
    const days = [makeGameDayVM(1)]; // stadiumId: 'NYY'
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });

    const wrapper = mount(TripTimelineStrip, getMountOpts());

    const store = useHighlightStore();
    store.setHovered('BOS'); // different stadium
    await wrapper.vm.$nextTick();

    const card = wrapper.findComponent({ name: 'TripTimelineCard' });
    expect(card.props('isActive')).toBe(false);
  });

  it('does not call setHovered when card has null stadiumId', async () => {
    const travelDay: TimelineDayViewModel = {
      ...makeGameDayVM(1),
      type:         'travel_day',
      stadiumId:    null,
      matchupLabel: null,
      localTime:    null,
      timeZoneAbbr: null,
    };
    mockUseTimeline({ timelineDays: [travelDay], isLoading: false, error: null });

    const wrapper = mount(TripTimelineStrip, getMountOpts());
    const cardItem = wrapper.find('.timeline-card-item');
    await cardItem.trigger('mouseenter');

    const store = useHighlightStore();
    expect(store.hoveredStadiumId).toBeNull();
  });
});
