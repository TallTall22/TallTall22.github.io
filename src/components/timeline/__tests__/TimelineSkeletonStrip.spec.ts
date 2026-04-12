import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import TimelineSkeletonStrip from '../TimelineSkeletonStrip.vue';

beforeAll(() => {
  Object.defineProperty(window, 'visualViewport', {
    value: {
      width: 1024,
      height: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    writable: true,
  });
});

const vuetify = createVuetify({ components, directives });
const mountOptions = { global: { plugins: [vuetify] } };

describe('TimelineSkeletonStrip', () => {
  it('renders 8 skeleton cards', () => {
    const wrapper = mount(TimelineSkeletonStrip, mountOptions);
    const cards = wrapper.findAll('.skeleton-card');
    expect(cards).toHaveLength(8);
  });

  it('has data-testid="timeline-skeleton-strip"', () => {
    const wrapper = mount(TimelineSkeletonStrip, mountOptions);
    expect(wrapper.find('[data-testid="timeline-skeleton-strip"]').exists()).toBe(true);
  });

  it('has aria-busy="true"', () => {
    const wrapper = mount(TimelineSkeletonStrip, mountOptions);
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it('has aria-label for screen readers', () => {
    const wrapper = mount(TimelineSkeletonStrip, mountOptions);
    const strip = wrapper.find('[data-testid="timeline-skeleton-strip"]');
    expect(strip.attributes('aria-label')).toBeTruthy();
  });
});
