// src/components/timeline/__tests__/TripTimelineCard.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import TripTimelineCard from '../TripTimelineCard.vue';
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

function makeGameDayVM(overrides: Partial<TimelineDayViewModel> = {}): TimelineDayViewModel {
  return {
    dayNumber:        1,
    date:             '2026-04-06',
    dayOfWeek:        'Mon',
    type:             'game_day',
    matchupLabel:     'Red Sox @ Yankees',
    localTime:        '7:05 PM EDT',
    timeZoneAbbr:     'EDT',
    stadiumName:      'Yankee Stadium',
    city:             'New York',
    homeTeamLogo:     'https://example.com/nyy.svg',
    awayTeamLogo:     'https://example.com/bos.svg',
    homeTeamNickname: 'Yankees',
    awayTeamNickname: 'Red Sox',
    distanceKm:       null,
    ...overrides,
  };
}

function makeTravelDayVM(overrides: Partial<TimelineDayViewModel> = {}): TimelineDayViewModel {
  return {
    dayNumber:        2,
    date:             '2026-04-07',
    dayOfWeek:        'Tue',
    type:             'travel_day',
    matchupLabel:     null,
    localTime:        null,
    timeZoneAbbr:     null,
    stadiumName:      null,
    city:             null,
    homeTeamLogo:     '',
    awayTeamLogo:     '',
    homeTeamNickname: null,
    awayTeamNickname: null,
    distanceKm:       342,
    ...overrides,
  };
}

const mountOpts = { global: { plugins: [vuetify] } };

describe('TripTimelineCard', () => {
  it('renders matchup label for game day', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeGameDayVM() },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('Red Sox @ Yankees');
  });

  it('renders local time and timezone for game day', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeGameDayVM() },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('7:05 PM EDT');
  });

  it('renders travel day variant with Travel Day label', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeTravelDayVM() },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('Travel Day');
  });

  it('renders distance when distanceKm is provided', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeTravelDayVM({ distanceKm: 342 }) },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('342');
  });

  it('hides distance when distanceKm is null', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeTravelDayVM({ distanceKm: null }) },
      ...mountOpts,
    });
    expect(wrapper.text()).not.toContain('km');
  });

  it('renders team nickname text when logos are empty string', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeGameDayVM({ homeTeamLogo: '', awayTeamLogo: '' }) },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('Yankees');
    expect(wrapper.text()).toContain('Red Sox');
  });

  it('renders stadium name and city when provided', () => {
    const wrapper = mount(TripTimelineCard, {
      props: { day: makeGameDayVM() },
      ...mountOpts,
    });
    expect(wrapper.text()).toContain('Yankee Stadium');
    expect(wrapper.text()).toContain('New York');
  });
});
