# F-03: Quick Start Presets — TODO

## Executive Summary

**What**: A row of 5 preset-trip buttons (加州之旅, 美東巡迴, 大湖區, 德克薩斯, 東南探索) that fill `homeStadiumId`, `startDate`, and `endDate` in `tripStore` with a single click, then emit a signal for future routing (F-04/F-05) and confirm success via Vuetify snackbar.

**Why**: Reduces time-to-first-plan for new users who do not know which stadiums/dates to pick; serves as a discoverable entry point into the planner.

**Scope — IN**:
- Define 5 preset data objects (region, stadium ID, duration)
- `useQuickStartPresets` composable that applies a preset to the store
- `PresetBadge.vue` (Atom) → `PresetButtonGroup.vue` (Molecule) → `QuickStartPresets.vue` (Organism)
- Vuetify snackbar confirmation after apply
- `requestTripGeneration()` stub in `tripStore` (no-op, connected by F-04)
- Overwrite-existing-selection behaviour (silent overwrite — no modal)
- Unit tests for composable; component tests for all three components

**Scope — OUT**:
- Actual route generation algorithm (F-04/F-05)
- Custom user-defined presets / persistence
- Multi-preset comparison or preview mode

---

## Domain Analysis & Recursive Validation

### Given-When-Then Behavioral Scenarios

**Scenario 1: Happy Path — User applies a preset on a blank form**
- **Given**: `tripStore.startDate === null`, `tripStore.endDate === null`, `tripStore.homeStadiumId === null`; stadiums data has loaded; `QuickStartPresets` is mounted and visible
- **When**: User clicks the "加州之旅" preset button
- **Then**:
  - `tripStore.homeStadiumId` is set to `'LAD'`
  - `tripStore.startDate` is set to `todayISO()`
  - `tripStore.endDate` is set to `addDays(todayISO(), 14)`
  - `activePresetId` ref is set to `'california'`
  - `confirmationMessage` ref is set to `'已套用「加州之旅」預設行程 ✓'`
  - Vuetify `v-snackbar` appears for 3 seconds
  - `tripStore.requestTripGeneration()` is called (no-op stub)
  - `QuickStartPresets` emits `preset-applied` with `PresetAppliedEvent` payload

**Scenario 2: Overwrite — User applies preset when store already has values**
- **Given**: `tripStore.startDate`, `endDate`, `homeStadiumId` all have prior values
- **When**: User clicks the "德克薩斯" preset button
- **Then**: All three store fields are silently overwritten; no confirmation modal; snackbar confirms apply

**Scenario 3: Active Highlight Desync — User manually edits dates after applying preset**
- **Given**: User applied a preset; `activePresetId !== null`
- **When**: User manually changes `startDate` via `DateRangePicker`
- **Then**: `activePresetId` resets to `null`; no preset button shows active state

**Scenario 4: Stadium Load Failure — Preset applied before stadiums loaded**
- **Given**: `useStadiumSelector` has `loadError !== null`
- **When**: User clicks any preset button
- **Then**: Store is still set (accepts any string as homeStadiumId); snackbar still confirms apply

**Scenario 5: Same Preset Re-clicked — Idempotent application**
- **Given**: A preset is already active
- **When**: User clicks it again
- **Then**: `applyPreset` re-runs with fresh `todayISO()`; snackbar re-appears; `activePresetId` stays set

---

### Technical Feasibility Assessment

| Concern | Finding | Mitigation |
|---|---|---|
| **Race Condition** | `applyPreset` sets 3 store refs in sequence | All writes synchronous in one tick; no await needed |
| **Active Highlight Desync** | `activePresetId` can drift if user edits dates | `watch` on store refs; `isApplyingPreset` guard flag |
| **Prop Drilling** | Depth is 2 (`QuickStartPresets` → `PresetButtonGroup` → `PresetBadge`) | Acceptable; no Provide-Inject needed |
| **Type Safety** | `startStadiumId` must match `Stadium.id` in JSON | Validated: LAD, NYY, CHC, TEX, ATL all exist |
| **Performance** | 5 static buttons, no computed cascade | No memoization needed |
| **Error Handling** | No async in preset application | No try-catch; `todayISO()` called at click time |
| **State Persistence** | Preset selection should NOT persist | `activePresetId` is local composable ref, not Pinia |
| **F-04 Stub** | `requestTripGeneration()` must exist before F-03 ships | Add as explicit no-op with `console.info` marker |

---

## Component Hierarchy (Atomic Design)

```
QuickStartPresets.vue          [Organism]
  └── PresetButtonGroup.vue    [Molecule]
        └── PresetBadge.vue    [Atom]  × 5

Supporting:
  src/data/presets.ts          [Static data constant]
  src/composables/useQuickStartPresets.ts
  src/types/presets.ts         [Domain types]
```

**Integration point in `App.vue`**:
```
v-col
  ├── QuickStartPresets    ← NEW (placed ABOVE StadiumSelector)
  ├── StadiumSelector      (existing F-02)
  └── DateRangePicker      (existing F-01)
```

---

## Task Breakdown & Atomic Decomposition

### Phase 1: Type System & Data Contracts

> **Why First**: TypeScript interfaces lock the shape of preset data and component boundaries before any implementation begins.

#### 1.1 — Create `src/types/presets.ts` ✅

**Scope**: New file defining all F-03 domain types.
**Effort**: 1h

```ts
// src/types/presets.ts
import type { ISODateString } from './models';

export type PresetRegion =
  | 'california'
  | 'east-coast'
  | 'great-lakes'
  | 'texas'
  | 'southeast';

export interface QuickStartPreset {
  id:             PresetRegion;
  name:           string;
  emoji:          string;
  description:    string;
  startStadiumId: string;
  durationDays:   number;
}

export interface PresetAppliedEvent {
  preset:         QuickStartPreset;
  startDate:      ISODateString;
  endDate:        ISODateString;
  homeStadiumId:  string;
}
```

#### 1.2 — Add Preset Component Props/Emits to `src/types/components.ts` ✅

**Scope**: Append interfaces for all three new components.
**Effort**: 45min

```ts
// Append to src/types/components.ts
import type { QuickStartPreset, PresetAppliedEvent, PresetRegion } from './presets';

// ── PresetBadge (Atom) ────────────────────────────────────────
export interface PresetBadgeProps {
  preset:    QuickStartPreset;
  isActive?: boolean;
  disabled?: boolean;
}
export interface PresetBadgeEmits {
  (e: 'select', preset: QuickStartPreset): void;
}

// ── PresetButtonGroup (Molecule) ──────────────────────────────
export interface PresetButtonGroupProps {
  presets:         QuickStartPreset[];
  activePresetId?: PresetRegion | null;
  disabled?:       boolean;
}
export interface PresetButtonGroupEmits {
  (e: 'preset-selected', preset: QuickStartPreset): void;
}

// ── QuickStartPresets (Organism) ──────────────────────────────
export interface QuickStartPresetsProps {
  disabled?: boolean;
}
export interface QuickStartPresetsEmits {
  (e: 'preset-applied', event: PresetAppliedEvent): void;
}
```

#### 1.3 — Create `src/data/presets.ts` with 5 Preset Constants ✅

**Scope**: Static preset data. Stadium IDs verified against stadiums.json: LAD ✓, NYY ✓, CHC ✓, TEX ✓, ATL ✓
**Effort**: 1h

```ts
// src/data/presets.ts
import type { QuickStartPreset } from '@/types/presets';

export const QUICK_START_PRESETS: readonly QuickStartPreset[] = [
  {
    id:             'california',
    name:           '加州之旅',
    emoji:          '🌴',
    description:    '從道奇球場出發，串聯天使、運動家、巨人、教士',
    startStadiumId: 'LAD',
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
  {
    id:             'great-lakes',
    name:           '大湖區',
    emoji:          '🌊',
    description:    '從小熊球場出發，串聯白襪、釀酒人、老虎',
    startStadiumId: 'CHC',
    durationDays:   21,
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
    id:             'southeast',
    name:           '東南探索',
    emoji:          '🍑',
    description:    '從勇士球場出發，串聯馬林魚、光芒、紅人',
    startStadiumId: 'ATL',
    durationDays:   14,
  },
] as const;
```

#### 1.4 — Re-export new types from `src/types/index.ts` ✅

**Scope**: Add barrel export for `presets.ts`.
**Effort**: 15min

```ts
// Append to src/types/index.ts
export * from './presets';
```

---

### Phase 2: Store Extension & Composable

> **Why Second**: The store stub must exist before the composable, and the composable before any component consumes it.

#### 2.1 — Extend `tripStore.ts` with `requestTripGeneration()` stub ✅

**Scope**: Add `tripGenerationRequested` flag + `requestTripGeneration()` action.
**Effort**: 30min

```ts
// Inside useTripStore defineStore callback — add:
const tripGenerationRequested = ref<boolean>(false);

function requestTripGeneration(): void {
  tripGenerationRequested.value = true;
  console.info('[F-03 → F-04 hook] requestTripGeneration called. Awaiting F-04 implementation.');
}

// Add to return: tripGenerationRequested, requestTripGeneration
```

#### 2.2 — Implement `useQuickStartPresets` composable ✅

**Scope**: Core business logic — applies preset to store, tracks active preset, manages snackbar, handles desync detection.
**Effort**: 1.5h

**Full TypeScript signature**:
```ts
// src/composables/useQuickStartPresets.ts
export interface UseQuickStartPresetsReturn {
  presets:             readonly QuickStartPreset[];
  activePresetId:      Ref<PresetRegion | null>;
  confirmationMessage: Ref<string | null>;
  showSnackbar:        Ref<boolean>;
  applyPreset:         (preset: QuickStartPreset) => PresetAppliedEvent;
  dismissSnackbar:     () => void;
}
```

**Key implementation details**:
- `applyPreset`: synchronously sets homeStadium, startDate, endDate; sets activePresetId; triggers snackbar; calls `requestTripGeneration()`
- Desync watcher on `[startDate, endDate, homeStadiumId]` → resets `activePresetId` to null when values drift
- `isApplyingPreset` boolean guard (plain, not a ref) to suppress watcher during own store writes
- Use `nextTick(() => { isApplyingPreset = false; })` to re-enable watcher after Vue reactivity flush

#### 2.3 — Unit test `useQuickStartPresets` composable ✅

**Scope**: `src/composables/__tests__/useQuickStartPresets.spec.ts`
**Effort**: 1.5h

**Test cases**:
- ✓ `applyPreset('california')` sets store `homeStadiumId` to `'LAD'`
- ✓ `applyPreset` sets `startDate` to `todayISO()` (mocked with `vi.setSystemTime`)
- ✓ `applyPreset` sets `endDate` to `addDays(today, 14)`
- ✓ `applyPreset` sets `activePresetId` to preset.id
- ✓ `applyPreset` sets `showSnackbar` to true
- ✓ `applyPreset` returns correct `PresetAppliedEvent` shape
- ✓ Overwrites previous store values (overwrite scenario)
- ✓ `activePresetId` resets to null when `store.startDate` changes externally
- ✓ `activePresetId` resets to null when `store.endDate` changes externally
- ✓ `activePresetId` resets to null when `store.homeStadiumId` changes externally
- ✓ Same preset applied twice → snackbar shows again
- ✓ `validateDateRange(startDate, endDate)` is always valid for all 5 presets
- ✓ All 5 preset `durationDays` are < `MAX_TRIP_DAYS` (180)

---

### Phase 3: Atomic Component Architecture

> **Why After Phase 2**: Components are thin shells over the composable; writing them before the composable risks re-work.

#### 3.1 — Build `PresetBadge.vue` (Atom) ✅

**Scope**: `src/components/control-panel/PresetBadge.vue`
**Effort**: 1h

- Displays emoji, name, `durationDays` chip
- `variant="flat"` + `color="primary"` when `isActive=true`; `variant="outlined"` otherwise
- Emits `select` with preset on click
- `aria-label` and `aria-pressed` for accessibility
- `disabled` prop threads through to `<v-btn>`

#### 3.2 — Build `PresetButtonGroup.vue` (Molecule) ✅

**Scope**: `src/components/control-panel/PresetButtonGroup.vue`
**Effort**: 1h

- Renders a `v-for` of `PresetBadge` components
- Passes `isActive = (activePresetId === preset.id)` to each badge
- Bubbles `preset-selected` emit upward
- `role="group"` + `aria-label="快速行程預設"` on wrapper div
- `display: flex; gap: 8px; flex-wrap: wrap;` styling

#### 3.3 — Build `QuickStartPresets.vue` (Organism) ✅

**Scope**: `src/components/control-panel/QuickStartPresets.vue`
**Effort**: 1.5h

- Consumes `useQuickStartPresets`
- Renders `v-card` with title, subtitle, `PresetButtonGroup`, and `v-snackbar`
- Handles `preset-selected` → calls `applyPreset` → emits `preset-applied`
- Snackbar: `timeout=3000`, `color="success"`, dismiss button

#### 3.4 — Integrate `QuickStartPresets` into `App.vue` ✅

**Scope**: Add `<QuickStartPresets>` above `<StadiumSelector>` in `App.vue`
**Effort**: 30min

```html
<!-- F-03: Quick Start Presets -->
<QuickStartPresets
  class="mb-4"
  @preset-applied="(e) => console.info('[F-03] preset-applied', e)"
/>
```

---

### Phase 4: Error Handling & Defensive Hardening

#### 4.1 — DEV-mode stadium ID validation warning ✅

**Scope**: Inside `useQuickStartPresets`, after stadiums load (onMounted + DEV only)
**Effort**: 1h

```ts
if (import.meta.env.DEV) {
  const result = await loadStadiums();
  const loadedIds = new Set(result.stadiums.map(s => s.id));
  for (const preset of QUICK_START_PRESETS) {
    if (!loadedIds.has(preset.startStadiumId)) {
      console.warn(`[F-03] Preset "${preset.name}" startStadiumId "${preset.startStadiumId}" not in stadiums.json`);
    }
  }
}
```

Note: This is a DEV-only secondary load call; does NOT block or affect preset application.

#### 4.2 — `isApplyingPreset` watcher guard ✅

**Scope**: Implementation detail inside `useQuickStartPresets` (part of 2.2, extracted as explicit task)
**Effort**: 1h

- Plain boolean `isApplyingPreset` (not a ref)
- Set to `true` at start of `applyPreset`, reset to `false` in `nextTick` callback
- Desync watcher checks `if (isApplyingPreset) return;` before resetting `activePresetId`
- Prevents premature desync reset during `applyPreset`'s own synchronous store writes

---

### Phase 5: Testing

#### 5.1 — Data Integrity Test for `QUICK_START_PRESETS` ✅

**Scope**: `src/data/__tests__/presets.spec.ts`
**Effort**: 1h

- ✓ Has exactly 5 entries
- ✓ All preset IDs are unique
- ✓ All `durationDays` between 1 and `MAX_TRIP_DAYS - 1` (179)
- ✓ All `name` values are non-empty strings
- ✓ All `emoji` values are non-empty strings
- ✓ All `startStadiumId` values match a `Stadium.id` in `stadiums.json`
- ✓ No duplicate `startStadiumId` values

#### 5.2 — Component Tests for `PresetBadge.vue` and `PresetButtonGroup.vue` ✅

**Scope**: `src/components/control-panel/__tests__/PresetBadge.spec.ts` and `PresetButtonGroup.spec.ts`
**Effort**: 1.5h

**PresetBadge**:
- ✓ Renders `preset.emoji`, `preset.name`, `preset.durationDays`
- ✓ Uses `'flat'` variant when `isActive=true`
- ✓ Uses `'outlined'` variant when `isActive=false`
- ✓ Emits `'select'` with preset on click
- ✓ Does NOT emit `'select'` when `disabled=true`
- ✓ Has correct `aria-label` and `aria-pressed` attributes

**PresetButtonGroup**:
- ✓ Renders N `PresetBadge` for N presets in prop
- ✓ Passes `isActive=true` only to matching preset
- ✓ Emits `'preset-selected'` with correct preset when badge emits `'select'`
- ✓ Passes `disabled` prop to all badges

#### 5.3 — Integration Test: Full Preset Application Flow ✅

**Scope**: `src/components/control-panel/__tests__/QuickStartPresets.spec.ts`
**Effort**: 1.5h

- ✓ Clicking "加州之旅" sets `tripStore.homeStadiumId` to `'LAD'`
- ✓ Clicking "加州之旅" sets `tripStore.startDate` to `todayISO()` (mocked)
- ✓ Clicking "加州之旅" sets `tripStore.endDate` to `addDays(today, 14)`
- ✓ After click, snackbar appears with correct message
- ✓ `'preset-applied'` event emitted with correct `PresetAppliedEvent` payload
- ✓ Active button highlighted after click
- ✓ Manually calling `store.setStartDate('...')` → button loses active state
- ✓ Clicking second preset overwrites first preset's values
- ✓ `tripStore.requestTripGeneration` was called after `applyPreset`

---

## Implementation Ordering & Critical Path

```
Phase 1: Types & Data (3h 15min)
  1.1 presets.ts types          (1h)    ← CRITICAL — blocks all
  1.2 components.ts additions   (45min) ← parallel with 1.3
  1.3 data/presets.ts constants (1h)    ← parallel with 1.2
  1.4 index.ts barrel export    (15min) ← after 1.1
     ↓

Phase 2: Store + Composable (3h 30min)
  2.1 tripStore extension       (30min) ← parallel with Phase 1
  2.2 useQuickStartPresets      (1.5h)  ← needs 1.1, 1.3, 2.1
  2.3 composable unit tests     (1.5h)  ← needs 2.2
     ↓

Phase 3: Components (4h)
  3.1 PresetBadge.vue           (1h)    ← needs 1.2
  3.2 PresetButtonGroup.vue     (1h)    ← needs 3.1
  3.3 QuickStartPresets.vue     (1.5h)  ← needs 3.2, 2.2
  3.4 App.vue integration       (30min) ← needs 3.3
     ↓

Phase 4: Defensive Hardening (2h)
  4.1 Stadium ID DEV warning    (1h)    ← refinement of 2.2
  4.2 isApplyingPreset guard    (1h)    ← refinement of 2.2

Phase 5: Testing (4h)
  5.1 Data integrity tests      (1h)    ← after 1.3
  5.2 Badge + Group tests       (1.5h)  ← after 3.2
  5.3 Integration tests         (1.5h)  ← after 3.3
```

**Critical Path**: `1.1 → 1.2 → 2.2 → 3.1 → 3.2 → 3.3 → 3.4 → 5.3`

---

## Acceptance Criteria

### Phase 1
- [ ] `PresetRegion`, `QuickStartPreset`, `PresetAppliedEvent` compile under `tsc --strict` with zero errors
- [ ] All Props/Emits interfaces present in `components.ts` and exported from `index.ts`
- [ ] `QUICK_START_PRESETS` array has 5 entries with valid `durationDays` (all < 180)
- [ ] Zero `any` types introduced

### Phase 2
- [ ] `tripStore.requestTripGeneration()` exists, sets flag, logs marker
- [ ] `useQuickStartPresets()` returns all documented fields
- [ ] `applyPreset()` sets all 3 store fields synchronously
- [ ] Desync watcher clears `activePresetId` on external store mutation
- [ ] Composable unit tests pass

### Phase 3
- [ ] `PresetBadge` renders emoji, name, duration; emits `select`; reflects `isActive`
- [ ] `PresetButtonGroup` renders 5 badges; only active one has `isActive=true`
- [ ] `QuickStartPresets` shows `v-snackbar` after click
- [ ] `QuickStartPresets` emits `preset-applied` with `PresetAppliedEvent`
- [ ] `App.vue` renders `QuickStartPresets` above `StadiumSelector`; no console errors on mount
- [ ] `StadiumSelector` and `DateRangePicker` update reactively after preset applied

### Phase 4
- [ ] DEV mode warns if any preset `startStadiumId` not in loaded stadiums list
- [ ] Rapid double-click does NOT result in `activePresetId` being null after second click
- [ ] Store mutation sequence during `applyPreset` does not cause intermediate watcher-triggered resets

### Phase 5
- [ ] All 5.1 data integrity assertions pass (including cross-check against stadiums.json)
- [ ] All `PresetBadge` and `PresetButtonGroup` component tests pass
- [ ] All integration tests in `QuickStartPresets.spec.ts` pass
- [ ] No TypeScript compiler errors (`tsc --noEmit`)
- [ ] ARIA attributes present on preset buttons

---

## Anti-Patterns & Constraints

🚫 DO NOT put `QUICK_START_PRESETS` inside composable or component — keep in `src/data/presets.ts`
🚫 DO NOT use `any` for the `PresetAppliedEvent` emit payload
🚫 DO NOT call `loadStadiums()` inside `useQuickStartPresets` in production paths (only DEV validation)
🚫 DO NOT add `activePresetId` to `tripStore` — ephemeral UI state stays local to composable
🚫 DO NOT implement actual routing in F-03 — `requestTripGeneration()` is explicitly a stub
