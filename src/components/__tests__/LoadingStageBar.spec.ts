import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import LoadingStageBar from '../LoadingStageBar.vue';

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

describe('LoadingStageBar', () => {
  it('is hidden when stage is idle', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'idle' } });
    expect(wrapper.find('.loading-stage-bar').exists()).toBe(false);
  });

  it('shows filtering label when stage is filtering', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'filtering' } });
    expect(wrapper.text()).toContain('正在篩選比賽資料');
  });

  it('shows routing label when stage is routing', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'routing' } });
    expect(wrapper.text()).toContain('正在計算最佳行程路線');
  });

  it('renders progress-linear when active', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'filtering' } });
    expect(wrapper.find('.v-progress-linear').exists()).toBe(true);
  });

  it('has role="status" for accessibility', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'routing' } });
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it('aria-label matches the stage label', () => {
    const wrapper = mount(LoadingStageBar, { ...mountOptions, props: { stage: 'filtering' } });
    const bar = wrapper.find('.loading-stage-bar');
    expect(bar.attributes('aria-label')).toContain('篩選');
  });
});
