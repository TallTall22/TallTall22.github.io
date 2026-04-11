// src/components/control-panel/__tests__/QuickStartPresets.spec.ts
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { VSnackbar } from 'vuetify/components';
import QuickStartPresets from '../QuickStartPresets.vue';
import { useTripStore } from '@/stores/tripStore';
import { addDays } from '@/composables/useDateRange';
import type { PresetAppliedEvent } from '@/types/presets';

const MOCK_TODAY = '2025-07-01';

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

let pinia: ReturnType<typeof createPinia>;

function makeVuetify() {
  return createVuetify({ components, directives });
}

function mountComponent() {
  return mount(QuickStartPresets, {
    global: { plugins: [makeVuetify(), pinia] },
  });
}

/** Find a button whose text includes the given label. */
function findButtonByLabel(wrapper: ReturnType<typeof mountComponent>, label: string) {
  return wrapper.findAll('button').find(b => b.text().includes(label));
}

describe('QuickStartPresets integration', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${MOCK_TODAY}T12:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking "加州之旅" sets tripStore.homeStadiumId to "LAD"', async () => {
    const wrapper = mountComponent();
    const btn = findButtonByLabel(wrapper, '加州之旅');
    await btn!.trigger('click');
    const store = useTripStore();
    expect(store.homeStadiumId).toBe('LAD');
    wrapper.unmount();
  });

  it('clicking "加州之旅" sets tripStore.startDate to today', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    const store = useTripStore();
    expect(store.startDate).toBe(MOCK_TODAY);
    wrapper.unmount();
  });

  it('clicking "加州之旅" sets tripStore.endDate to addDays(today, 14)', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    const store = useTripStore();
    expect(store.endDate).toBe(addDays(MOCK_TODAY, 14));
    wrapper.unmount();
  });

  it('after clicking "加州之旅", the snackbar modelValue becomes true', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    await nextTick();
    const snackbar = wrapper.findComponent(VSnackbar);
    expect(snackbar.props('modelValue')).toBe(true);
    wrapper.unmount();
  });

  it('emits "preset-applied" with correct PresetAppliedEvent payload', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    const emitted = wrapper.emitted<[PresetAppliedEvent]>('preset-applied');
    expect(emitted).toBeTruthy();
    const event = emitted![0][0];
    expect(event.preset.id).toBe('california');
    expect(event.startDate).toBe(MOCK_TODAY);
    expect(event.endDate).toBe(addDays(MOCK_TODAY, 14));
    expect(event.homeStadiumId).toBe('LAD');
    wrapper.unmount();
  });

  it('"加州之旅" button has aria-pressed="true" after being clicked', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    await nextTick();
    const btn = findButtonByLabel(wrapper, '加州之旅');
    expect(btn!.attributes('aria-pressed')).toBe('true');
    wrapper.unmount();
  });

  it('"加州之旅" button loses aria-pressed="true" after store.setStartDate changes externally', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    await nextTick(); // allow isApplyingPreset guard to clear

    const store = useTripStore();
    store.setStartDate('2025-09-01');
    await nextTick(); // watcher fires, activePresetId → null
    await nextTick(); // component re-renders

    const btn = findButtonByLabel(wrapper, '加州之旅');
    expect(btn!.attributes('aria-pressed')).toBe('false');
    wrapper.unmount();
  });

  it('clicking "德州野牛行" after "加州之旅" overwrites store values', async () => {
    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');
    await nextTick();

    await findButtonByLabel(wrapper, '德州野牛行')!.trigger('click');
    const store = useTripStore();
    expect(store.homeStadiumId).toBe('TEX');
    expect(store.endDate).toBe(addDays(MOCK_TODAY, 14));
    wrapper.unmount();
  });

  it('applyPreset calls tripStore.requestTripGeneration()', async () => {
    const store = useTripStore();
    const spy = vi.spyOn(store, 'requestTripGeneration');

    const wrapper = mountComponent();
    await findButtonByLabel(wrapper, '加州之旅')!.trigger('click');

    expect(spy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
