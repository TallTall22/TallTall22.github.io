// src/components/timeline/__tests__/TripTimelineStrip.spec.ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { ref } from 'vue';

// Mock the composable BEFORE importing the component (Vitest hoisting)
vi.mock('@/composables/useTimeline', () => ({
  useTimeline: vi.fn(),
}));

import TripTimelineStrip from '../TripTimelineStrip.vue';
import { useTimeline } from '@/composables/useTimeline';
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
const mountOpts = { global: { plugins: [vuetify] } };

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
    const wrapper = mount(TripTimelineStrip, mountOpts);
    expect(wrapper.text()).toContain('Generate a trip');
  });

  it('renders loading state when isLoading is true', () => {
    mockUseTimeline({ timelineDays: [], isLoading: true, error: null });
    const wrapper = mount(TripTimelineStrip, mountOpts);
    // v-progress-linear renders when loading
    expect(wrapper.find('.v-progress-linear').exists()).toBe(true);
  });

  it('renders error alert when error is set', () => {
    mockUseTimeline({ timelineDays: [], isLoading: false, error: 'Stadium data unavailable. Please refresh.' });
    const wrapper = mount(TripTimelineStrip, mountOpts);
    expect(wrapper.text()).toContain('Stadium data unavailable');
  });

  it('renders N cards matching timelineDays.length', () => {
    const days = [makeGameDayVM(1), makeGameDayVM(2), makeGameDayVM(3)];
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });
    const wrapper = mount(TripTimelineStrip, mountOpts);
    const cards = wrapper.findAllComponents({ name: 'TripTimelineCard' });
    expect(cards).toHaveLength(3);
  });

  it('applies horizontal scroll container', () => {
    const days = [makeGameDayVM(1)];
    mockUseTimeline({ timelineDays: days, isLoading: false, error: null });
    const wrapper = mount(TripTimelineStrip, mountOpts);
    const scrollArea = wrapper.find('[data-testid="timeline-scroll-area"]');
    expect(scrollArea.exists()).toBe(true);
  });
});
