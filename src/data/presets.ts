// src/data/presets.ts
import type { QuickStartPreset } from '@/types/presets';

/**
 * Static Quick Start preset definitions.
 * startStadiumId values are verified against src/assets/data/stadiums.json.
 * Do NOT add presets here without verifying the startStadiumId exists in that file.
 */
export const QUICK_START_PRESETS: readonly QuickStartPreset[] = [
  {
    id: 'california',
    name: '加州之旅',
    emoji: '🌴',
    description: '從道奇球場出發，串聯天使、運動家、巨人、教士',
    startStadiumId: 'LAD',
    durationDays: 14,
  },
  {
    id: 'east-coast',
    name: '美東巡迴',
    emoji: '🗽',
    description: '從洋基球場出發，經大都會、費城人、金鶯、紅襪',
    startStadiumId: 'NYY',
    durationDays: 21,
  },
  {
    id: 'great-lakes',
    name: '五大湖區',
    emoji: '⚾',
    description: '從世界系列常客小熊出發，挑戰白襪、釀酒人、老虎的工業重鎮主場',
    startStadiumId: 'CHC',
    durationDays: 21,
  },
  {
    id: 'texas',
    name: '德州野牛行',
    emoji: '🐂',
    description: '豔陽下的遊騎兵新球場，再南下太空人，感受德州特大號棒球熱情',
    startStadiumId: 'TEX',
    durationDays: 14,
  },
  {
    id: 'southeast',
    name: '南方紅土路',
    emoji: '🔥',
    description: '從勇士的信任銀行球場出發，沿南方海岸串聯馬林魚、光芒，回頭拜訪紅人',
    startStadiumId: 'ATL',
    durationDays: 14,
  },
] as const;
