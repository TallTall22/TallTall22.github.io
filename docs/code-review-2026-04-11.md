# Code Review Report — MLB Ballpark Tour Planner

**Reviewer**: GitHub Copilot (Expert Review)
**Date**: 2026-04-11
**Scope**: F-01 → F-04 (Types · Services · Composables · Components · Tests)
**Test baseline at review time**: 130 tests / 11 files — all green

---

## Executive Summary

The codebase demonstrates strong architectural discipline: zero `any` types across production code, well-named TypeScript interfaces, Atomic Design component hierarchy respected, and Pinia store boundaries correctly observed in all but one component. The F-04 pipeline (game filtering composable + service layer) is the most complete and best-tested module.

**6 actionable findings** were identified: 1 critical bug (loading state can get permanently stuck), 4 warnings (type contract gaps, non-idiomatic lifecycle registration, missing discriminated union, untested error paths), and 1 suggestion. No security vulnerabilities were found.

---

## Findings

---

### 🔴 CRITICAL — Must fix before F-05

---

#### CR-01 · `isLoading` permanently stuck at `true`

**File**: `src/composables/useGameFilter.ts` — `runFilter()` function

**Issue**: When the race-condition guard fires (stale request discarded) AND the concurrent new request returns early due to `!startDate.value || !endDate.value`, `isLoading` is set to `true` by the original request and never reset.

**Reproduction scenario**:
1. User sets valid dates → `requestTripGeneration()` → `runFilter(1)` starts, `isLoading = true`
2. User clears start date → `requestTripGeneration()` is called again → `tripGenerationRequestId = 2`
3. Watcher fires → `runFilter(2)` is called → `!startDate.value` guard fires → returns early (no async work, `isLoading` unchanged)
4. `runFilter(1)` resolves → `requestId(1) !== tripGenerationRequestId(2)` → race guard fires → returns early
5. **`isLoading` stays `true` forever.** Loading spinner never disappears.

**Current code**:
```typescript
// useGameFilter.ts – runFilter()
async function runFilter(requestId: number): Promise<void> {
  if (!startDate.value || !endDate.value) return;  // ← no isLoading reset

  isLoading.value = true;
  // ...
  const result = await loadGames();

  if (!isMounted || requestId !== tripGenerationRequestId.value) return;  // ← no isLoading reset

  // ... isLoading.value = false only reached on success path
}
```

**Fix**:
```typescript
async function runFilter(requestId: number): Promise<void> {
  // Guard: if this is the latest request and dates are invalid, ensure loading is reset
  if (!startDate.value || !endDate.value) {
    if (requestId === tripGenerationRequestId.value) {
      isLoading.value = false;
    }
    return;
  }

  isLoading.value = true;
  loadError.value = null;

  const result = await loadGames();

  // Race condition guard: a newer request supersedes this one; it will manage isLoading
  if (!isMounted || requestId !== tripGenerationRequestId.value) return;

  // ... rest unchanged
}
```

**Impact**: Without this fix, any sequence of "trigger → clear dates → trigger again" locks the UI in a permanent loading state until the component is destroyed.

---

### 🟡 WARNING — Should fix before shipping

---

#### CR-02 · `onBeforeUnmount` registered inside `onMounted` (non-idiomatic, fragile)

**File**: `src/composables/useStadiumSelector.ts`, lines 51–63

**Issue**: The `isMounted` flag and its corresponding `onBeforeUnmount` cleanup are registered **inside** the `onMounted` callback, before the `await`. This exploits the fact that Vue 3 tracks `currentInstance` synchronously. It works today but:
- Is explicitly non-idiomatic per Vue 3 documentation ("lifecycle hooks must be called synchronously during `setup`")
- Will silently break if any code is refactored to add an `await` before this registration
- Contrasts with the correct pattern used in `useGameFilter.ts` (same project)

**Current code**:
```typescript
onMounted(async () => {
  isLoading.value = true;
  let isMounted = true;
  onBeforeUnmount(() => { isMounted = false; }); // ← registered inside onMounted
  const result = await loadStadiums();
  if (!isMounted) return;
  // ...
});
```

**Fix** (align with `useGameFilter.ts` pattern):
```typescript
let isMounted = true;
onBeforeUnmount(() => { isMounted = false; }); // ← at composable setup level

onMounted(async () => {
  isLoading.value = true;
  const result = await loadStadiums();
  if (!isMounted) return;
  // ...
});
```

---

#### CR-03 · `DateRangePickerEndProps` type contract is incomplete

**File**: `src/types/components.ts` (lines 29–37) vs `src/components/control-panel/DateRangePickerEnd.vue` (lines 5–13)

**Issue**: The exported `DateRangePickerEndProps` interface is missing two props that the component actually accepts and uses: `hasError?: boolean` and `errorMsg?: string | null`. The component defines its own inline prop type and does not use the shared interface, so there is no compile-time error. But any consumer who imports `DateRangePickerEndProps` to type-check usage of the component will get incorrect type information.

**Current `DateRangePickerEndProps`** (components.ts):
```typescript
export interface DateRangePickerEndProps {
  modelValue: ISODateString | null;
  minDate:    ISODateString | null;
  maxDate:    ISODateString | null;
  disabled?:  boolean;
  label?:     string;
  // ← hasError and errorMsg are missing
}
```

**Actual component props** (DateRangePickerEnd.vue):
```typescript
defineProps<{
  modelValue: ISODateString | null;
  minDate:    ISODateString | null;
  maxDate:    ISODateString | null;
  disabled?:  boolean;
  label?:     string;
  hasError?:  boolean;    // ← not in interface
  errorMsg?:  string | null; // ← not in interface
}>()
```

**Fix**: Update `components.ts` to match and have the component reference the shared type:
```typescript
// components.ts
export interface DateRangePickerEndProps {
  modelValue: ISODateString | null;
  minDate:    ISODateString | null;
  maxDate:    ISODateString | null;
  disabled?:  boolean;
  label?:     string;
  hasError?:  boolean;
  errorMsg?:  string | null;
}
```

---

#### CR-04 · `TripDay` should be a discriminated union

**File**: `src/types/models.ts`, lines 43–51

**Issue**: `TripDay` uses a `type` field (`'game_day' | 'travel_day'`) but does not enforce which fields are required per variant. F-05's routing algorithm will need to narrow `TripDay` by `type` and access `game` and `stadiumId` safely. With the current flat interface, TypeScript cannot narrow — both `game` and `stadiumId` remain optional regardless of `type`.

**Current**:
```typescript
export interface TripDay {
  dayNumber:             number;
  date:                  ISODateString;
  type:                  'game_day' | 'travel_day';
  stadiumId?:            string;          // optional on both types
  game?:                 Game;            // optional on both types
  distanceFromPrevious?: number;
  estimatedTravelTime?:  number;
}
```

**Fix** — discriminated union:
```typescript
interface TripDayBase {
  dayNumber:             number;
  date:                  ISODateString;
  distanceFromPrevious?: number;
  estimatedTravelTime?:  number;
}

export interface GameDay extends TripDayBase {
  type:      'game_day';
  stadiumId: string;  // required for game days
  game:      Game;    // required for game days
}

export interface TravelDay extends TripDayBase {
  type:      'travel_day';
  stadiumId?: string;  // optional destination hint
  game?:      never;   // explicitly absent
}

export type TripDay = GameDay | TravelDay;
```

**Impact**: Without this change, F-05 will likely need unsafe casts (`game!`) when building itinerary rendering logic. Fix now before F-05 consumes this type.

---

#### CR-05 · Two critical error paths in `gameService` are untested

**File**: `src/services/__tests__/gameService.spec.ts`

**Issue**: The `catch` block in `loadGames()` handles two distinct cases — `SyntaxError` → `PARSE_ERROR` and any other `Error` → `FETCH_FAILED`. Both are documented as placeholder tests with no actual assertions:

```typescript
it('returns PARSE_ERROR when import throws SyntaxError', async () => {
  // ... no assertions, documented limitation
});

it('returns FETCH_FAILED when import throws a non-SyntaxError', async () => {
  // ... no assertions, documented limitation
});
```

These are the paths that fire in production when the JSON bundle is corrupted or the network fails. They deserve real coverage.

**Fix** — test via indirect spying on the module import machinery:
```typescript
it('returns PARSE_ERROR when import throws SyntaxError', async () => {
  // Approach: create a spy on the dynamic import by mocking the entire module
  // to throw on the NEXT call after cache is cleared
  vi.doMock('@/assets/data/games.json', () => {
    throw new SyntaxError('Unexpected token < in JSON');
  });
  _clearGameCache();
  // Re-import service to get fresh module that uses the throwing mock
  const { loadGames: freshLoad } = await import('@/services/gameService?fresh=' + Date.now());
  const result = await freshLoad();
  expect(result.error).toBe('PARSE_ERROR');
  vi.doUnmock('@/assets/data/games.json');
});
```

If `vi.doMock` + re-import proves unreliable, extract the import into an injectable dependency (function parameter or `provide`) to make it easily mockable in tests.

---

### 🟢 SUGGESTION — Consider improving

---

#### CR-06 · `QuickStartPresets.vue` imports `useTripStore` for a single property

**File**: `src/components/control-panel/QuickStartPresets.vue`, line 14

**Issue**: The component calls `useTripStore()` directly purely to access `tripStore.isLoading` for the `disabled` prop. The composable `useQuickStartPresets()` already accesses the same store internally. This creates two independent store subscriptions in the same component and leaks store implementation details into the template layer.

**Current**:
```typescript
// QuickStartPresets.vue
const tripStore = useTripStore();
// used only as: :disabled="disabled || tripStore.isLoading"
```

**Fix** — expose `isLoading` from the composable:
```typescript
// useQuickStartPresets.ts – add to return type
export interface UseQuickStartPresetsReturn {
  // ...existing fields...
  isTripGenerating: Ref<boolean>; // renamed to clarify semantics
}

// inside useQuickStartPresets():
const { isLoading } = storeToRefs(store);
// ...
return { ..., isTripGenerating: isLoading };
```

Then the component becomes:
```typescript
const { ..., isTripGenerating } = useQuickStartPresets();
// :disabled="disabled || isTripGenerating"
```

---

## Positive Observations

**Type safety discipline is exemplary.** Zero `any` in all production files. Every composable exports a named `UseXxxReturn` interface. All `catch` blocks use typed error codes rather than bare `Error` objects. The `_clearGameCache()` testing escape hatch in `gameService.ts` is a well-considered design that follows the same pattern as other services.

**F-04 composable architecture is correct.** The version-stamp race-condition pattern (`requestId !== tripGenerationRequestId.value` checked post-`await`) is the right approach and is correctly implemented. The dual `onBeforeUnmount` guards (`isMounted` flag + `stopWatcher()`) provide defense-in-depth against memory leaks.

**Atomic Design boundaries are respected.** `PresetBadge` (Atom), `PresetButtonGroup` (Molecule), `QuickStartPresets` (Organism) hierarchy is correctly layered. No Atom or Molecule directly calls a Pinia store.

**`normalizeDate` in both date picker components** correctly uses local-time `getFullYear/getMonth/getDate` rather than `toISOString()`, avoiding the UTC midnight boundary bug that affected an earlier version of `useDateRange.ts`.

**Test fixture factories** (`makeGame`, `makeStadium`) are used consistently across all test files, ensuring test data hygiene and reducing copy-paste drift.

---

## Recommended Action Plan

| Priority | Finding | File | Effort |
|----------|---------|------|--------|
| 🔴 Fix now | CR-01: `isLoading` stuck bug | `useGameFilter.ts` | 15 min |
| 🟡 Fix before F-05 | CR-04: `TripDay` discriminated union | `types/models.ts` | 30 min |
| 🟡 Fix before F-05 | CR-03: `DateRangePickerEndProps` gap | `types/components.ts` | 10 min |
| 🟡 Fix this sprint | CR-02: `onBeforeUnmount` in `onMounted` | `useStadiumSelector.ts` | 10 min |
| 🟡 Fix this sprint | CR-05: Untested error paths | `gameService.spec.ts` | 45 min |
| 🟢 Next opportunity | CR-06: Double store import | `QuickStartPresets.vue` | 20 min |

**Total estimated fix effort: ~2 hours.**

CR-04 (`TripDay` discriminated union) is the highest-leverage fix: if left as-is, F-05's routing algorithm will accumulate unsafe type assertions (`game!`, `stadiumId!`) that become technical debt. Fix the type now before 10 downstream consumers are written against the weak contract.

---

*Report generated by GitHub Copilot · mlb_field project · F-01 to F-04 scope*
