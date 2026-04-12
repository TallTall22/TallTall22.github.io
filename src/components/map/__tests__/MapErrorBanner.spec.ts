import { describe, it, expect, vi, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import MapErrorBanner from '../MapErrorBanner.vue';

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

describe('MapErrorBanner', () => {
  it('renders the error message', () => {
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Test error', onRetry: null },
    });
    expect(wrapper.text()).toContain('Test error');
  });

  it('banner is visible on mount', () => {
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Error', onRetry: null },
    });
    expect(wrapper.find('.map-error-banner').exists()).toBe(true);
  });

  it('does NOT show retry button when onRetry is null', () => {
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Error', onRetry: null },
    });
    // No 重試 button text present
    expect(wrapper.text()).not.toContain('重試');
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Error', onRetry },
    });
    expect(wrapper.text()).toContain('重試');
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Error', onRetry },
    });
    // Find the retry button by text content
    const buttons = wrapper.findAll('button');
    const retryBtn = buttons.find(b => b.text().includes('重試'));
    expect(retryBtn).toBeDefined();
    await retryBtn!.trigger('click');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('banner reappears when message prop changes (watch resets dismissed)', async () => {
    const wrapper = mount(MapErrorBanner, {
      ...mountOptions,
      props: { message: 'Error 1', onRetry: null },
    });
    // Confirm it starts visible
    expect(wrapper.find('.map-error-banner').exists()).toBe(true);
    // Change message — watch() should reset dismissed to false
    await wrapper.setProps({ message: 'Error 2' });
    expect(wrapper.find('.map-error-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Error 2');
  });
});
