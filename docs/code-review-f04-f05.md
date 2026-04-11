# Expert Code Review — MLB Ballpark Tour Planner
**Date**: 2026-04-11  
**Reviewer**: Copilot (Claude Sonnet 4.6)  
**Scope**: Full codebase — F-01 through F-05  
**Files Reviewed**: 30 source files, 11 test files

---

## Executive Summary

**Overall Grade: B−**

### Top 3 Strengths
1. **Rigorous type system** — discriminated union `TripDay = GameDay | TravelDay`, typed error codes (`RoutingAlgorithmErrorCode`, `GameLoadErrorCode`), and `ISODateString` branded alias prevent whole classes of bugs.
2. **Pure-function architecture in `routingAlgorithm.ts`** — zero Vue/Pinia imports, every export is independently unit-testable; Haversine, date math, greedy scoring, and itinerary assembly are all side-effect free.
3. **Race condition protection** — both `useGameFilter` and `useRoutingAlgorithm` implement version-stamp guards (`tripGenerationRequestId`, `requestCounter`) and `isMounted` checks, preventing stale async writes.

### Top 3 Critical Issues
1. **F-04/F-05 pipeline is never mounted in `App.vue`** — `useRoutingAlgorithm` (and its embedded `useGameFilter`) is not instantiated anywhere in the component tree, so `requestTripGeneration()` increments a counter that no watcher is observing. The app's core feature — generating a trip — is **completely non-functional** end-to-end.
2. **Always-passing test in `useRoutingAlgorithm.integration.spec.ts`** — all error-path assertions are guarded by `if (mockComputeTrip.mock.calls.length > 0)`, meaning the test passes even if the entire routing flow is never exercised. This gives false confidence in a critical pipeline.
3. **`store.selectedTrip` mutated directly from a composable** — `useRoutingAlgorithm` writes `store.selectedTrip = result.trip` and `store.selectedTrip = null` outside any store action, breaking Pinia's action-boundary pattern and making state mutations untraceable.

---

## Critical Issues (P0 — Must Fix Before Merge)

### P0-1 — F-04/F-05 pipeline never activated (`App.vue`)

**File**: `src/App.vue`, lines 1–50  
**File**: `src/stores/tripStore.ts`, lines 44–48

`App.vue` imports `QuickStartPresets`, `StadiumSelector`, and `DateRangePicker` but does **not** import or call `useRoutingAlgorithm`. The store's `tripGenerationRequestId` is incremented by `requestTripGeneration()` (called by `useQuickStartPresets.applyPreset`), but neither `useGameFilter` nor `useRoutingAlgorithm` is instantiated in the component tree — so the counter's watcher is never registered. Pressing any preset does: snackbar → store counter increment → nothing else.

**Fix**: Add to `App.vue` setup:
```typescript
import { useRoutingAlgorithm } from '@/composables/useRoutingAlgorithm';

// In <script setup>:
const { generatedTrip, isRouting, routingError } = useRoutingAlgorithm();
```
This instantiates the composable (and its embedded `useGameFilter`), registering both watchers in the correct component lifecycle. Pass `isRouting`/`generatedTrip` to downstream display components.

---

### P0-2 — Always-passing test hides routing error path (`useRoutingAlgorithm.integration.spec.ts`)

**File**: `src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts`, lines 160–165

```typescript
// BEFORE — conditional assertions: test passes even if routing never runs
if (mockComputeTrip.mock.calls.length > 0) {
  expect(wrapper.vm.routingError).toBe('NO_GAMES');
  expect(wrapper.vm.generatedTrip).toBeNull();
  expect(store.selectedTrip).toBeNull();
  expect(wrapper.vm.isRouting).toBe(false);
}
```

The entire test body is guarded by a condition that is vacuously satisfied when the watcher never fires. Since `filteredGames` is empty by default and changes only after `useGameFilter` processes a result, the watcher on `filteredGames` may never trigger in the test environment — so `mockComputeTrip` is never called, and the `if` block is skipped. The test always passes regardless of the bug being tested.

**Fix**:
```typescript
// AFTER — unconditional, with explicit flush
store.setStartDate('2026-06-15');
store.setEndDate('2026-06-15');
store.setHomeStadium('NYY');
store.requestTripGeneration();
await flushAll();

// Unconditional assertions — will fail if composable is broken
expect(mockComputeTrip).toHaveBeenCalled();
expect(wrapper.vm.routingError).toBe('NO_GAMES');
expect(wrapper.vm.generatedTrip).toBeNull();
expect(store.selectedTrip).toBeNull();
expect(wrapper.vm.isRouting).toBe(false);
```

---

### P0-3 — `store.selectedTrip` mutated outside a store action (`useRoutingAlgorithm.ts`)

**File**: `src/composables/useRoutingAlgorithm.ts`, lines 69 and 72

```typescript
// BEFORE — direct mutation from composable (bypasses action layer)
store.selectedTrip  = null;       // line 69
store.selectedTrip  = result.trip; // line 72
```

While Pinia setup-stores allow direct ref assignment, this pattern breaks traceability: the store has actions for every other state mutation (`setStartDate`, `setEndDate`, `setHomeStadium`) but `selectedTrip` is bypassed. DevTools will not log a named action, and future guards (e.g., preventing updates while loading) must be added in multiple places.

**Fix** — add action to `tripStore.ts`:
```typescript
function setSelectedTrip(trip: Trip | null): void {
  selectedTrip.value = trip;
}

// return it:
return { ..., setSelectedTrip };
```
Then in `useRoutingAlgorithm.ts`:
```typescript
store.setSelectedTrip(null);       // line 69
store.setSelectedTrip(result.trip); // line 72
```

---

## High Priority Issues (P1 — Fix This Sprint)

### P1-1 — `stadiumService.ts` has no explicit caching (asymmetric with `gameService.ts`)

**File**: `src/services/stadiumService.ts`  
**File**: `src/services/gameService.ts`, lines 9–12

`gameService.ts` maintains an explicit module-level `_cachedGames` and documents why. `stadiumService.ts` re-runs `isStadiumArray` validation on every call. While Vite's dynamic import mechanism implicitly caches the JSON module, `isStadiumArray` still executes on each call, the pattern is asymmetric, and in test environments with `vi.mock`, this difference causes surprising divergence.

`loadStadiums()` is called from three places: `useStadiumSelector` (on mount), `useQuickStartPresets` (DEV-only on mount), and `routingService.computeTrip` (on every trip computation). Without explicit caching, each call goes through the validation guard unnecessarily.

**Fix**:
```typescript
let _cachedStadiums: Stadium[] | null = null;

export function _clearStadiumCache(): void { _cachedStadiums = null; }

export async function loadStadiums(): Promise<StadiumLoadResult> {
  if (_cachedStadiums !== null) {
    return { stadiums: _cachedStadiums, error: null };
  }
  // ... existing try/catch, then:
  _cachedStadiums = raw;
  return { stadiums: raw, error: null };
}
```

---

### P1-2 — `isStadiumArray` does not validate `coordinates.lat/lng` types

**File**: `src/services/stadiumService.ts`, lines 5–15

```typescript
function isStadiumArray(data: unknown): data is Stadium[] {
  // ...
  typeof first['coordinates'] === 'object' &&
  first['coordinates'] !== null
  // ❌ does NOT check that lat/lng are numbers
}
```

`routingAlgorithm.ts` accesses `stadium.coordinates.lat` and `stadium.coordinates.lng` directly in `haversineDistance`. If `stadiums.json` has a stadium with `"coordinates": {}` or `"coordinates": {"lat": null, "lng": null}`, the cast to `Stadium[]` succeeds but `haversineDistance` receives `undefined`, producing `NaN` distances that silently corrupt the entire greedy scoring without any error.

**Fix**:
```typescript
const coords = first['coordinates'] as Record<string, unknown>;
return (
  typeof coords['lat'] === 'number' &&
  typeof coords['lng'] === 'number'
  // ... rest of checks
);
```

---

### P1-3 — `isGameArray` validates only the first array element

**File**: `src/services/gameService.ts`, lines 27–38

The comment says "performance trade-off" but this is a correctness risk. Records at indices 1–N are cast to `Game[]` without validation. A corrupt entry at position 500 would have its non-string `date` field silently pass through `filterByDateRange`'s string comparison, and non-string coordinates (if any downstream service uses them) would produce incorrect results. An adversarial or malformed JSON could smuggle objects with prototype-polluting keys.

**Fix** (balanced approach — validate all, but only required fields):
```typescript
function isGameArray(data: unknown): data is Game[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((item) => {
    const g = item as Record<string, unknown>;
    return (
      typeof g['gameId']       === 'string' &&
      typeof g['date']         === 'string' &&
      typeof g['homeTeamId']   === 'string' &&
      typeof g['awayTeamId']   === 'string' &&
      typeof g['startTimeUtc'] === 'string' &&
      typeof g['venue']        === 'string'
    );
  });
}
```
Alternatively, use `data.slice(0, 10)` as a sampling approach if the full-array scan is genuinely performance-sensitive for large datasets.

---

### P1-4 — Duplicate date-arithmetic implementations (`daysBetween` vs `diffDays`)

**File**: `src/utils/routingAlgorithm.ts`, lines 44–49 (`daysBetween`)  
**File**: `src/composables/useDateRange.ts`, lines 22–35 (`addDays`, `diffDays`)

Both files independently implement date difference logic using local `new Date(y, m-1, d)` construction. The implementations are functionally equivalent but are maintained separately — a bug fix in one will not automatically propagate to the other.

```typescript
// routingAlgorithm.ts — daysBetween
const msA = new Date(ay, am - 1, ad).getTime();
const msB = new Date(by, bm - 1, bd).getTime();
return Math.round((msB - msA) / 86_400_000);

// useDateRange.ts — diffDays (via toDate)
return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
// toDate('2026-06-15') → new Date('2026-06-15T00:00:00') — local midnight
```

**Fix**: Export `daysBetween` from `routingAlgorithm.ts` (already pure) and re-use it in `useDateRange.ts`, or extract a shared `src/utils/dateUtils.ts`.

---

### P1-5 — `filterHomeOnly` has a misleading name and the implementation won't filter real data

**File**: `src/composables/useGameFilter.ts`, lines 34–38

```typescript
export function filterHomeOnly(games: Game[]): Game[] {
  return games.filter(
    (g) => typeof g.homeTeamId === 'string' && g.homeTeamId.length > 0,
  );
}
```

The JSDoc says "F-04.2: Keep home games only." The name implies filtering to home games of the selected team. But the implementation only validates that `homeTeamId` is a non-empty string — it does not compare against any team. In a properly-formed MLB schedule JSON, **every** game has a non-empty `homeTeamId`, so this function passes 100% of games through and provides zero domain filtering.

If the intent is truly a data-integrity guard, the name should be `filterGamesWithValidHomeTeamId`. If the intent is to filter to games where a specific team is the home team (for a future feature), the signature needs a `teamId` parameter.

**Fix** (rename for clarity):
```typescript
/** Data integrity guard: drop records with missing homeTeamId. */
export function filterValidHomeGames(games: Game[]): Game[] {
  return games.filter((g) => typeof g.homeTeamId === 'string' && g.homeTeamId.length > 0);
}
```

---

### P1-6 — `console.info` hardcoded in production store action

**File**: `src/stores/tripStore.ts`, lines 46–48

```typescript
function requestTripGeneration(): void {
  tripGenerationRequestId.value += 1;
  // eslint-disable-next-line no-console
  console.info('[F-03 → F-04 hook] requestTripGeneration called, id:', tripGenerationRequestId.value);
}
```

The comment explicitly says "Do NOT remove the console.info — it is the integration hook marker." This is a problematic design decision — hardcoded `console.info` in a store action will spam the browser console in production. A user pressing a preset 10 times creates 10 log lines.

**Fix**:
```typescript
function requestTripGeneration(): void {
  tripGenerationRequestId.value += 1;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[F-03 → F-04 hook] requestTripGeneration called, id:', tripGenerationRequestId.value);
  }
}
```

---

### P1-7 — `useRoutingAlgorithm` embeds `useGameFilter` — double-instance risk

**File**: `src/composables/useRoutingAlgorithm.ts`, line 33

```typescript
const { filteredGames } = useGameFilter(); // creates a NEW useGameFilter instance
```

If any other component independently calls `useGameFilter()`, two separate watcher instances will be registered on `tripGenerationRequestId`. Both will fire `loadGames()` simultaneously — doubling network requests and independently managing `isLoading`/`loadError` refs with no coordination.

**Recommended fix**: The composables should share a single `useGameFilter` instance. Either:
1. **Provide/inject pattern**: Mount `useGameFilter` at `App.vue` level and provide the `filteredGames` ref via `provide/inject`.
2. **Return and thread**: Have `App.vue` call both composables separately, passing `filteredGames` to `useRoutingAlgorithm` as a parameter.

```typescript
// Option 2 — explicit wiring in App.vue
const { filteredGames, loadError: gameLoadError } = useGameFilter();
const { generatedTrip, isRouting, routingError } = useRoutingAlgorithm(filteredGames);
```

---

## Medium Priority Issues (P2 — Fix Next Sprint)

### P2-1 — `validation` computed uses non-reactive `todayISO()` (stale after midnight)

**File**: `src/composables/useDateRange.ts`, lines 81–83

```typescript
const validation = computed<ValidationResult>(() =>
  validateDateRange(startDate.value, endDate.value)
);
```

`validateDateRange` calls `todayISO()` internally, which calls `new Date()`. This is NOT a reactive dependency — Vue's dependency tracker cannot observe `Date` constructor calls. If a user loads the app before midnight and keeps it open, the `validation` computed will use a stale "today" value until `startDate` or `endDate` is changed.

**Fix**: Make `today` a reactive dependency:
```typescript
const today = computed(() => todayISO()); // already reactive
const validation = computed<ValidationResult>(() =>
  validateDateRange(startDate.value, endDate.value, today.value) // pass today explicitly
);

// Update validateDateRange signature:
export function validateDateRange(
  startDate: ISODateString | null,
  endDate:   ISODateString | null,
  today:     ISODateString = todayISO(), // default for backward compat
): ValidationResult {
```

---

### P2-2 — Module-level `devValidationDone` flag causes cross-test pollution

**File**: `src/composables/useQuickStartPresets.ts`, lines 13, 61

```typescript
let devValidationDone = false; // module-level, survives across test runs

if (import.meta.env.DEV) {
  onMounted(async () => {
    if (devValidationDone) return;
    devValidationDone = true;
    // ...
  });
}
```

In Vitest, `import.meta.env.DEV` is `true` (non-production mode). The module is cached across tests in the same test suite, so after the first test that mounts a component using `useQuickStartPresets`, `devValidationDone` is permanently `true`. Subsequent tests skip the validation even if they need it, and a test that resets module state won't see consistent behavior.

**Fix**: Either use `vi.resetModules()` in `afterEach`, or expose a reset function for testing:
```typescript
export function _resetDevValidation(): void {
  devValidationDone = false;
}
```

---

### P2-3 — `onBeforeUnmount` registered twice in `useGameFilter`

**File**: `src/composables/useGameFilter.ts`, lines 113–114 and 166

```typescript
let isMounted = true;
onBeforeUnmount(() => { isMounted = false; }); // line 114

// ... 50 lines later ...
onBeforeUnmount(() => { stopWatcher(); });      // line 166
```

Two separate `onBeforeUnmount` hooks are registered. Vue 3 supports this and will call both in registration order, so it is not a bug. However, it is harder to reason about — the isMounted setter and watcher teardown should be colocated. More critically, `stopWatcher()` is already called by Vue's internal cleanup when the component unmounts (because the watcher is created inside `setup()`). The explicit `stopWatcher()` call in `onBeforeUnmount` is redundant.

**Fix**: Consolidate and remove the redundant explicit stopWatcher call (Vue cleans up `watch()` automatically on component unmount when called inside `setup()`):
```typescript
onBeforeUnmount(() => {
  isMounted = false;
  // stopWatcher() is called automatically by Vue — no need to register separately
});
```

---

### P2-4 — `stadiumService.test.ts` is a hard-coded integration test with brittle assertions

**File**: `src/services/__tests__/stadiumService.test.ts`, lines 6–9, 22

```typescript
it('returns 30 stadiums on success', async () => {
  expect(result.stadiums).toHaveLength(30); // breaks if MLB expands to 32 teams
});
// ...
expect(s.logoUrl).toMatch(/mlbstatic\.com/); // breaks if logo URL format changes
```

This test loads real `stadiums.json` data (no mocking) and asserts the exact count of 30 stadiums. If a future sprint adds a 31st team, this test breaks. The `logoUrl` regex is tied to an external CDN URL pattern.

**Fix**: Either mock `stadiumService` for unit tests and keep one integration test that validates structure (not count), or change the assertion:
```typescript
expect(result.stadiums.length).toBeGreaterThanOrEqual(30);
```

---

### P2-5 — `flushAll` helper in integration test is fragile

**File**: `src/composables/__tests__/useRoutingAlgorithm.integration.spec.ts`, lines 86–92

```typescript
async function flushAll(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
  await new Promise<void>((r) => setTimeout(r, 0));
  await nextTick();
}
```

This approach of stacking `nextTick` calls is brittle. The number of ticks needed depends on the exact number of async hops in the composable chain — if the pipeline adds another `await`, tests using `flushAll()` may silently stop working. The `setTimeout(r, 0)` mixes macrotask and microtask flushing, making reasoning about timing harder.

**Fix**: Use Vitest's `vi.runAllTimersAsync()` or `@vue/test-utils`'s `flushPromises()`:
```typescript
import { flushPromises } from '@vue/test-utils';

// Replace flushAll() calls with:
await flushPromises();
```

---

### P2-6 — Missing test coverage for critical paths

The following scenarios have no test coverage:

| Scenario | Missing In |
|---|---|
| `EMPTY_ITINERARY` error path in `computeTrip` | `routingService.spec.ts` |
| `useStadiumSelector` unmount race (component destroyed before `loadStadiums` resolves) | `useStadiumSelector.test.ts` |
| `stadiumService` error paths (FETCH_FAILED, PARSE_ERROR) — only success+integration tested | `stadiumService.test.ts` |
| `buildItinerary` with a 180-day range (boundary test) | `routingAlgorithm.spec.ts` |
| `haversineDistance` with antipodal points | `routingAlgorithm.spec.ts` |
| `useGameFilter` with overlapping concurrent `requestTripGeneration` calls from a real component | integration tests |
| `applyGameFilters` where `filterHomeOnly` rejects games (data anomaly path) | `useGameFilter.spec.ts` |

---

### P2-7 — `useRoutingAlgorithm` race guard uses independent counter disconnected from F-04

**File**: `src/composables/useRoutingAlgorithm.ts`, lines 40–43, 81–82

```typescript
let requestCounter = 0;  // private to this composable
// ...
requestCounter++;
void runRouting(requestCounter);
```

`useGameFilter` uses `tripGenerationRequestId` from the store for its race guard. `useRoutingAlgorithm` uses a private `requestCounter`. These are completely independent counting systems. There is no shared clock between F-04 and F-05. If F-04 fires twice rapidly (two `tripGenerationRequestId` increments), F-05 will also fire twice (two `filteredGames` changes), each with its own counter. The comment says "Both composables watch `tripGenerationRequestId`" but `useRoutingAlgorithm` **does not** watch `tripGenerationRequestId` — it watches `filteredGames`. The comment is incorrect.

This is functional as written (each composable's race guard is internally consistent), but the misleading comment creates maintenance risk. Fix the comment:
```typescript
// Watch filteredGames — fires after useGameFilter writes its result.
// Uses an internal requestCounter (NOT tripGenerationRequestId) because
// our trigger is filteredGames changes, not store increments.
```

---

## Low Priority Issues (P3 — Technical Debt)

### P3-1 — `App.vue` empty `onRangeConfirmed` stub

**File**: `src/App.vue`, lines 13–15

```typescript
function onRangeConfirmed(_range: { startDate: string; endDate: string }): void {
  // F-04 integration hook: trigger game filtering when date range is confirmed
}
```

This function is a no-op registered as an event handler. The actual F-04 trigger does not go through this event — it goes through `store.requestTripGeneration()` which is called via `useQuickStartPresets`. This empty stub creates a false impression that date-range confirmation independently triggers route generation. It should either be wired up or removed with a clear comment.

---

### P3-2 — Inline `!important` style in `App.vue`

**File**: `src/App.vue`, line 24

```html
<v-main class="pa-4" style="padding-top: 80px !important">
```

Inline styles with `!important` override all Vuetify responsive layout rules. This should be a scoped CSS rule. The `!important` suggests a Vuetify layout conflict was patched rather than solved.

**Fix**:
```html
<v-main class="pa-4 main-content">
```
```css
<style scoped>
.main-content {
  padding-top: 80px !important;
}
</style>
```

---

### P3-3 — `PresetBadge.vue` redundant disabled guard

**File**: `src/components/control-panel/PresetBadge.vue`, line 11

```typescript
function handleClick(): void {
  if (props.disabled) return; // redundant — Vuetify v-btn doesn't emit clicks when disabled
  emit('select', props.preset);
}
```

A Vuetify `v-btn` with `:disabled="true"` does not emit native click events. The guard is harmless but adds noise.

---

### P3-4 — `startStadiumId` typed as `string` instead of a narrower type

**File**: `src/types/presets.ts`, line 24

```typescript
export interface QuickStartPreset {
  readonly startStadiumId: string; // could be constrained to Stadium['id'] union
}
```

`startStadiumId` values are known at compile time (`'LAD'`, `'NYY'`, `'CHC'`, `'TEX'`, `'ATL'`) but typed as `string`. If `Stadium.id` were a union type (`'LAD' | 'NYY' | 'CHC' | ...`), TypeScript could catch mismatches at compile time. Runtime validation exists (the DEV `onMounted` check and the `presets.spec.ts` test), but compile-time guarantees are stronger.

---

### P3-5 — `assembleTripFromItinerary` non-deterministic `crypto.randomUUID()`

**File**: `src/utils/routingAlgorithm.ts`, line 210

```typescript
tripId: crypto.randomUUID(),
```

The UUID is non-deterministic, requiring test environments to polyfill `crypto.randomUUID` (done via `beforeAll` in two test files). A factory-pattern injection for the ID generator would improve testability:

```typescript
export function assembleTripFromItinerary(
  itinerary: TripDay[],
  options: RoutingOptions,
  generateId: () => string = () => crypto.randomUUID(),
): Trip {
```

---

### P3-6 — `types/index.ts` barrel re-export without tree-shaking concern

**File**: `src/types/index.ts`

```typescript
export * from './models';
export * from './components';
export * from './presets';
```

Type-only barrel files are fine in TypeScript (they are erased at compile time). No actionable issue, but if runtime values are ever added to type files, this barrel pattern requires review. Currently clean.

---

## File-by-File Analysis

### `src/types/models.ts`
**Issues**: None critical. 
- `TravelDay.game?: never` correctly narrows the union (good practice).
- `qualityScore` in `Trip` has no documented range — a `number` between 0–100, but consumers can't know this from the type alone. Consider `/** 0–100, integer */` JSDoc.
- `UiState` is defined but never imported or used anywhere in the reviewed files. Dead type.

---

### `src/types/components.ts`
**Issues**: Minor.  
- `DateRangePickerStartProps.minDate` is `ISODateString` (non-nullable) while `DateRangePickerEndProps.minDate` is `ISODateString | null`. Asymmetry is intentional but undocumented.

---

### `src/types/presets.ts`
**Issues**: See P3-4.  
`startStadiumId: string` could be stronger. `PresetRegion` union is correctly used as the `id` discriminant.

---

### `src/stores/tripStore.ts`
**Issues**: P0-3, P1-6.  
- `selectedTrip` is missing a setter action (P0-3).
- `console.info` in production action (P1-6).
- `clearDates()` correctly nulls both dates — no issue.
- `setStartDate` guards against end-before-start by nulling `endDate` — correct.

---

### `src/services/gameService.ts`
**Issues**: P1-3.  
- `isGameArray` validates only first element (P1-3).
- `_setGameJsonLoader` test hook is a reasonable pattern.
- Cache pattern correctly documented and implemented.
- `SyntaxError` vs generic error branching is correct.

---

### `src/services/stadiumService.ts`
**Issues**: P1-1, P1-2.  
- No caching (P1-1).
- `isStadiumArray` missing lat/lng type validation (P1-2).
- No test hook equivalent to `_clearGameCache` — tests that mock `loadStadiums` must use `vi.mock` or `vi.spyOn`, which is adequate.

---

### `src/services/routingService.ts`
**Issues**: P2-6 (missing EMPTY_ITINERARY test).  
- Logic is clean: early-exit guards in correct order (games first, then stadiums, then home lookup).
- `computeTrip` never throws — all error paths return `RoutingResult`. ✓
- `totalGamesAttended` / `totalTravelDays` counting is correct.

---

### `src/utils/routingAlgorithm.ts`
**Issues**: P1-4 (duplicate date math), P3-5 (non-deterministic UUID).  
- `buildItinerary` loop uses `cursor.setDate(cursor.getDate() + 1)` — this correctly handles DST transitions since `setDate` works in local time.
- `scoreGameCandidates` correctly drops games with unknown `homeTeamId` (data-integrity guard).
- `assembleTripFromItinerary` qualityScore formula `Math.round(gameDays / total * 100)` is correct; 0-itinerary case handled.
- The `MAX_REACH_KM = 5_000` scoring formula means a stadium exactly 5,000 km away scores 0 — still reachable but ranks last. This cliff-edge behavior at 5,000 km is undocumented but not a bug.

---

### `src/composables/useDateRange.ts`
**Issues**: P2-1 (stale today), P1-4 (duplicate date math), P2-3 (minor).  
- `toDate(iso)` correctly appends `T00:00:00` (local midnight) — correct timezone behavior.
- `onEndDateChange` guards: accepts dates that pass validation OR return `MISSING_END` — this is intentional (allow setting end date when start is missing), but the `MISSING_END` condition can never occur since `endDate` is `date` (non-null) in that branch. This is harmless dead code.
- `addDays` correctly handles DST via `setDate` local arithmetic.

---

### `src/composables/useGameFilter.ts`
**Issues**: P1-5, P2-3, P1-7.  
- Race condition guards are correct (see analysis in Executive Summary).
- `isLoading` stuck-at-true scenario is correctly handled by latest-request responsibility.
- `filterHomeOnly` misleading name (P1-5).
- Dual `onBeforeUnmount` (P2-3).

---

### `src/composables/useStadiumSelector.ts`
**Issues**: P2-6 (missing unmount race test).  
- `isMounted` guard correctly prevents post-unmount writes.
- `selectedOption` computed correctly derived from `options` + `homeStadiumId`. ✓
- `loadError` set to `result.error` directly — works correctly (null or error code).

---

### `src/composables/useQuickStartPresets.ts`
**Issues**: P2-2 (devValidationDone test pollution), P1-6 (indirectly, via calling requestTripGeneration).  
- `isApplyingPreset` guard pattern with `nextTick` is correct and well-designed.
- `applyPreset` correctly returns `PresetAppliedEvent` synchronously.
- The DEV validation `onMounted` is a good defensive pattern — but could load stadiums even when not needed (e.g., in tests). The `devValidationDone` flag mitigates this but has test isolation issues.
- `isTripGenerating` alias for `isLoading` from store — correctly reactive.

---

### `src/composables/useRoutingAlgorithm.ts`
**Issues**: P0-3, P1-7, P2-7.  
- Race guard using `requestCounter` is internally consistent.
- `isMounted` check before state writes prevents ghost mutations.
- See P2-7 for misleading comment about tripGenerationRequestId.

---

### `src/components/control-panel/PresetBadge.vue`
**Issues**: P3-3 (redundant guard).  
- `aria-label` and `aria-pressed` are correctly implemented for accessibility.
- `aria-hidden="true"` on emoji span is correct.

---

### `src/components/control-panel/PresetButtonGroup.vue`
**Issues**: None.  
- `role="group"` with `aria-label` is correct WAI-ARIA pattern.
- `:key="preset.id"` stable key. ✓

---

### `src/components/control-panel/QuickStartPresets.vue`
**Issues**: None significant.  
- `v-model="showSnackbar"` on `v-snackbar` correctly binds Vuetify's internal dismiss mechanism.
- `:disabled="disabled || isTripGenerating"` correctly propagates both disabled states.
- The snackbar `timeout="3000"` is appropriate.

---

### `src/App.vue`
**Issues**: P0-1, P3-1, P3-2.  
- Core pipeline never activated (P0-1).
- `onRangeConfirmed` dead stub (P3-1).
- `!important` inline style (P3-2).

---

### `src/data/presets.ts`
**Issues**: P3-4 (type constraint).  
- All 5 presets have unique IDs, non-empty names/descriptions/emojis.
- `durationDays` values (14, 21, 21, 14, 14) are all < `MAX_TRIP_DAYS` (180). ✓
- `as const` assertion correctly prevents runtime mutation.

---

## Architecture Assessment

### Data Flow

```
[User Action]
    │
    ▼
QuickStartPresets.vue                    DateRangePicker.vue / StadiumSelector.vue
    │                                           │
    ▼                                           ▼
useQuickStartPresets.applyPreset()      store.setStartDate/setEndDate/setHomeStadium()
    │
    ▼
store.requestTripGeneration()
    │
    ▼ (tripGenerationRequestId++ — watches below fire)
    │
    ├──▶ useGameFilter (watcher on tripGenerationRequestId)
    │         │  loadGames() → applyGameFilters()
    │         │  writes: filteredGames ref
    │         │
    │         ▼ (filteredGames changes — watch below fires)
    │
    └──▶ useRoutingAlgorithm (watcher on filteredGames)
              │  computeTrip() → routingService → buildItinerary()
              │  writes: store.selectedTrip
              │
              ▼
         [Trip displayed to user] ← NOT YET WIRED
```

**SoC Verdict**: Separation of concerns is well-designed in principle. Services are pure I/O, utils are pure functions, composables own reactive state, stores own shared state. The main violation is `useRoutingAlgorithm` directly mutating store state without an action (P0-3) and embedding `useGameFilter` rather than receiving it as a dependency (P1-7).

**Scalability Notes**:
- The greedy O(D×G) algorithm (180 days × ~500 games = 90,000 ops) is acceptable for current scale. If the game dataset grows to 10,000+ games (multiple seasons), performance should be profiled.
- The module-level game cache in `gameService.ts` means a user cannot refresh game data without a page reload. This is appropriate for a static dataset but will need revisiting if live data integration is planned.
- The `tripGenerationRequestId` counter approach is clever but undocumented — future developers need to understand the F-03→F-04 hook to maintain it.

---

## Test Quality Assessment

### Coverage Summary

| File | Unit Tests | Integration | Edge Cases |
|---|---|---|---|
| `routingAlgorithm.ts` | ✅ Excellent | N/A | ⚠️ Missing antipodal, 180-day |
| `gameService.ts` | ✅ Excellent | N/A | ✅ Good |
| `stadiumService.ts` | ❌ No unit (loads real data) | ✅ Implicit | ❌ No error paths |
| `routingService.ts` | ✅ Good | N/A | ❌ Missing EMPTY_ITINERARY |
| `useGameFilter.ts` (pure) | ✅ Excellent | ✅ Good | ⚠️ No filterHomeOnly anomaly |
| `useGameFilter.ts` (reactive) | N/A | ✅ Excellent | ✅ Race, unmount, isLoading |
| `useDateRange.ts` | ✅ Good | N/A | ⚠️ No midnight-crossing test |
| `useQuickStartPresets.ts` | ✅ Excellent | N/A | ✅ desync, guard, idempotency |
| `useStadiumSelector.ts` | ✅ Good | N/A | ❌ No unmount race test |
| `useRoutingAlgorithm.ts` | N/A | ⚠️ Critical always-pass bug | ❌ Missing |
| `presets.ts` | ✅ Excellent | N/A | N/A |

### Mock Quality
- **Good**: `vi.spyOn(gameService, 'loadGames')` pattern preserves the real module while intercepting calls. ✓
- **Good**: `_setGameJsonLoader` hook in gameService allows isolated import simulation. ✓
- **Problem**: `useRoutingAlgorithm.integration.spec.ts` mocks `loadGames` with a fixed inline result inside `vi.mock()` factory — the mock result doesn't reset between tests (only call counts reset). The `beforeEach` correctly re-mocks, but the initial `vi.mock` factory runs once per module. ✓ (handled correctly in `beforeEach`).
- **Problem**: `stadiumService.test.ts` uses real JSON data — this is not a unit test.

### False Positive Risk
- **HIGH**: `useRoutingAlgorithm.integration.spec.ts:160` — always-passing conditional (P0-2).
- **LOW**: `useDateRange.spec.ts` — all `validateDateRange` tests use `vi.useFakeTimers()`. The `todayISO()` call in the composable (used in `validation` computed) is not under fake timers in component context — could cause subtle time-dependent failures.

---

## Recommendations Summary

Ordered action list by priority:

| # | Priority | Action | File(s) |
|---|---|---|---|
| 1 | **P0** | Mount `useRoutingAlgorithm` in `App.vue` | `App.vue` |
| 2 | **P0** | Fix always-passing test in routing integration spec | `useRoutingAlgorithm.integration.spec.ts` |
| 3 | **P0** | Add `setSelectedTrip` action to store; remove direct mutation | `tripStore.ts`, `useRoutingAlgorithm.ts` |
| 4 | **P1** | Add explicit caching + `_clearStadiumCache` to `stadiumService` | `stadiumService.ts` |
| 5 | **P1** | Extend `isStadiumArray` to validate `coordinates.lat/lng` types | `stadiumService.ts` |
| 6 | **P1** | Extend `isGameArray` to validate all elements (or sampling) | `gameService.ts` |
| 7 | **P1** | Consolidate `daysBetween`/`diffDays` into shared utility | `routingAlgorithm.ts`, `useDateRange.ts` |
| 8 | **P1** | Rename `filterHomeOnly` to `filterGamesWithValidHomeTeamId` | `useGameFilter.ts` |
| 9 | **P1** | Guard `console.info` in `requestTripGeneration` with `import.meta.env.DEV` | `tripStore.ts` |
| 10 | **P1** | Refactor `useRoutingAlgorithm` to accept `filteredGames` as a parameter | `useRoutingAlgorithm.ts`, `App.vue` |
| 11 | **P2** | Make `today` a reactive parameter in `validateDateRange` | `useDateRange.ts` |
| 12 | **P2** | Add `_resetDevValidation` export or `vi.resetModules()` in tests | `useQuickStartPresets.ts` |
| 13 | **P2** | Consolidate double `onBeforeUnmount` in `useGameFilter` | `useGameFilter.ts` |
| 14 | **P2** | Replace `flushAll()` with `flushPromises()` from `@vue/test-utils` | integration specs |
| 15 | **P2** | Add missing tests: `EMPTY_ITINERARY`, `stadiumService` error paths, unmount race | test files |
| 16 | **P2** | Fix misleading comment about `tripGenerationRequestId` in `useRoutingAlgorithm` | `useRoutingAlgorithm.ts` |
| 17 | **P3** | Remove or wire up `onRangeConfirmed` stub in `App.vue` | `App.vue` |
| 18 | **P3** | Move `padding-top: 80px !important` to scoped CSS | `App.vue` |
| 19 | **P3** | Remove redundant `if (props.disabled) return` in `PresetBadge` | `PresetBadge.vue` |
| 20 | **P3** | Inject UUID generator in `assembleTripFromItinerary` for testability | `routingAlgorithm.ts` |
