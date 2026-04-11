// src/components/control-panel/__tests__/PresetBadge.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import PresetBadge from '../PresetBadge.vue';
import type { QuickStartPreset } from '@/types/presets';

const vuetify = createVuetify({ components, directives });

const samplePreset: QuickStartPreset = {
  id:             'california',
  name:           '加州之旅',
  emoji:          '🌴',
  description:    '從道奇球場出發，串聯天使、運動家、巨人、教士',
  startStadiumId: 'LAD',
  durationDays:   14,
};

function mountBadge(props: { preset?: QuickStartPreset; isActive?: boolean; disabled?: boolean } = {}) {
  return mount(PresetBadge, {
    props: { preset: samplePreset, ...props },
    global: { plugins: [vuetify] },
  });
}

describe('PresetBadge', () => {
  it('renders the preset emoji', () => {
    const wrapper = mountBadge();
    expect(wrapper.text()).toContain('🌴');
  });

  it('renders the preset name', () => {
    const wrapper = mountBadge();
    expect(wrapper.text()).toContain('加州之旅');
  });

  it('renders the preset durationDays', () => {
    const wrapper = mountBadge();
    expect(wrapper.text()).toContain('14');
  });

  it('isActive=true → flat variant class on button', () => {
    const wrapper = mountBadge({ isActive: true });
    expect(wrapper.find('button').classes()).toContain('v-btn--variant-flat');
  });

  it('isActive=false → outlined variant class on button', () => {
    const wrapper = mountBadge({ isActive: false });
    expect(wrapper.find('button').classes()).toContain('v-btn--variant-outlined');
  });

  it('emits "select" with the preset when clicked', async () => {
    const wrapper = mountBadge();
    await wrapper.find('button').trigger('click');
    const emitted = wrapper.emitted<[QuickStartPreset]>('select');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toStrictEqual(samplePreset);
  });

  it('disabled=true marks the button with the disabled attribute', () => {
    const wrapper = mountBadge({ disabled: true });
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true);
  });

  it('disabled=true prevents "select" from being emitted on click', async () => {
    const wrapper = mountBadge({ disabled: true });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('aria-label contains the preset name and durationDays', () => {
    const wrapper = mountBadge();
    const label = wrapper.find('button').attributes('aria-label') ?? '';
    expect(label).toContain('加州之旅');
    expect(label).toContain('14');
  });

  it('aria-pressed="true" when isActive=true', () => {
    const wrapper = mountBadge({ isActive: true });
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true');
  });

  it('aria-pressed="false" when isActive=false', () => {
    const wrapper = mountBadge({ isActive: false });
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false');
  });
});
