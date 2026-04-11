// src/components/control-panel/__tests__/PresetButtonGroup.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import PresetButtonGroup from '../PresetButtonGroup.vue';
import PresetBadge from '../PresetBadge.vue';
import type { QuickStartPreset } from '@/types/presets';

const vuetify = createVuetify({ components, directives });

const samplePresets: QuickStartPreset[] = [
  {
    id:             'california',
    name:           '加州之旅',
    emoji:          '🌴',
    description:    '從道奇球場出發，串聯天使、運動家、巨人、教士',
    startStadiumId: 'LAD',
    durationDays:   14,
  },
  {
    id:             'texas',
    name:           '德克薩斯',
    emoji:          '🤠',
    description:    '從遊騎兵球場出發，串聯太空人，再北上皇家',
    startStadiumId: 'TEX',
    durationDays:   14,
  },
  {
    id:             'east-coast',
    name:           '美東巡迴',
    emoji:          '🗽',
    description:    '從洋基球場出發，經大都會、費城人、金鶯、紅襪',
    startStadiumId: 'NYY',
    durationDays:   21,
  },
];

function mountGroup(props: {
  presets?: QuickStartPreset[];
  activePresetId?: import('@/types/presets').PresetRegion | null;
  disabled?: boolean;
} = {}) {
  return mount(PresetButtonGroup, {
    props: { presets: samplePresets, activePresetId: null, ...props },
    global: { plugins: [vuetify] },
  });
}

describe('PresetButtonGroup', () => {
  it('renders one PresetBadge per preset', () => {
    const wrapper = mountGroup();
    expect(wrapper.findAllComponents(PresetBadge)).toHaveLength(samplePresets.length);
  });

  it('only the matching preset badge has isActive=true', () => {
    const wrapper = mountGroup({ activePresetId: 'texas' });
    const badges = wrapper.findAllComponents(PresetBadge);
    const activeStates = badges.map(b => b.props('isActive') as boolean);
    expect(activeStates[0]).toBe(false); // california
    expect(activeStates[1]).toBe(true);  // texas
    expect(activeStates[2]).toBe(false); // east-coast
  });

  it('no badge is active when activePresetId is null', () => {
    const wrapper = mountGroup({ activePresetId: null });
    const badges = wrapper.findAllComponents(PresetBadge);
    for (const badge of badges) {
      expect(badge.props('isActive')).toBe(false);
    }
  });

  it('emits "preset-selected" with the preset when a badge emits "select"', async () => {
    const wrapper = mountGroup();
    const firstBadge = wrapper.findAllComponents(PresetBadge)[0];
    await firstBadge.trigger('click');
    // The badge's select event propagates to PresetButtonGroup's handleSelect,
    // which emits 'preset-selected'
    const emitted = wrapper.emitted<[QuickStartPreset]>('preset-selected');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual(samplePresets[0]);
  });

  it('threads disabled=true to all PresetBadge components', () => {
    const wrapper = mountGroup({ disabled: true });
    const badges = wrapper.findAllComponents(PresetBadge);
    for (const badge of badges) {
      expect(badge.props('disabled')).toBe(true);
    }
  });

  it('threads disabled=false to all PresetBadge components by default', () => {
    const wrapper = mountGroup();
    const badges = wrapper.findAllComponents(PresetBadge);
    for (const badge of badges) {
      expect(badge.props('disabled')).toBe(false);
    }
  });
});
