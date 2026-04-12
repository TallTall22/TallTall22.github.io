# Expert Code Review — MLB Ballpark Tour Planner
**Date**: 2026-04-11  
**Scope**: Full codebase (F-01 → F-06, Types, Services, Composables, Components)  
**Reviewer**: GitHub Copilot (claude-sonnet-4.6)

---

## Executive Summary

The MLB Ballpark Tour Planner is a well-structured Vue 3 / TypeScript SPA with strong defensive patterns: all async paths use request-counter race-condition guards, service layers return typed error codes instead of throwing, and pure algorithm functions are cleanly separated for unit testing. The most actionable risks are **dead/orphaned state** (a `tripStore.error` ref that is never written, two interfaces that are never used, and a composable return value that duplicates the Pinia store), **one-way map sync** (Leaflet user pans/zooms are not reflected back into `mapStore`), and **tile-error spam** that fires a reactive update per failed tile. No correctness-critical bugs were found after source validation — both the Haversine radian conversion and the `immediate: false` watcher are verified safe in current usage.

---

## Severity Legend

| Symbol | Meaning |
|---|---|
| 🔴 Critical | Bug that causes incorrect behavior or data loss |
| 🟡 Warning | Risk of bug, degraded UX, or future maintainability problem |
| 🔵 Info | Best practice deviation, minor improvement opportunity |

---

## Section 1: Type System & Data Contracts

### F1-1 🟡 `UiState` interface defined but never used
**File**: `src/types/models.ts:133-145`  
**Problem**: `UiState` was presumably intended as a unified app-state shape, but actual state lives in `tripStore` and `mapStore` as separate refs. The interface is never imported.  
**Fix**: Remove it, or replace the split-store pattern with a store that implements it.

---

### F1-2 🟡 `MapViewState` interface defined but never used
**File**: `src/types/map.ts:38-45`  
**Problem**: `mapStore` holds all the same fields (`center`, `zoom`, `isReady`, `hasError`, `errorMsg`) individually. The interface is never referenced.  
**Fix**: Delete the interface, or type the store's `$state` against it.

---

### F1-3 🟡 `MapPolylineLayerProps` duplicated across two files
**File**: `src/types/components.ts:94-96` and `src/components/map/MapPolylineLayer.vue:8-10`  
**Problem**: The component re-declares the same interface locally instead of importing the canonical definition from `@/types/components`.  
**Fix**:
```ts
// MapPolylineLayer.vue — remove local declaration, import instead:
import type { MapPolylineLayerProps } from '@/types/components';
const props = defineProps<MapPolylineLayerProps>();
```

---

### F1-4 🔵 `Game.series` uses inline anonymous type
**File**: `src/types/models.ts:36-40`  
**Problem**: The inline object type cannot be referenced independently (e.g. in service-layer guards or test factories).  
**Fix**:
```ts
export interface GameSeries { seriesId: string; gameNumber: number; maxGames: number; }
export interface Game { /* ... */ series?: GameSeries; }
```

---

## Section 2: State Management (Pinia Stores)

### F2-1 🟡 `tripStore.error` ref is exposed but never written — dead state
**File**: `src/stores/tripStore.ts:12, 57-73`  
**Problem**: `error = ref<string | null>(null)` is returned in the store's public API but no action ever mutates it. Consumers who watch it will never see a non-null value; errors from routing are surfaced through `useRoutingAlgorithm.routingError` instead.  
**Fix**: Remove from the return object, or add a `setError(msg: string | null)` action and wire it from the routing pipeline.

---

### F2-2 🟡 `mapStore.center` / `mapStore.zoom` never synced back from Leaflet
**File**: `src/components/map/MapViewContainer.vue:30-61`  
**Problem**: The Leaflet map is initialised from the store (`center`, `zoom`) but user pan/zoom events are never written back. `mapStore.setCenter` and `mapStore.setZoom` exist but are unused. Any component that reads the store coordinates (e.g. for "share map state") will always see stale defaults.  
**Fix**:
```ts
map.on('moveend', () => mapStore.setCenter({ lat: map.getCenter().lat, lng: map.getCenter().lng }));
map.on('zoomend', () => mapStore.setZoom(map.getZoom()));
```

---

### F2-3 🔵 No `reset()` action in either store
**File**: `src/stores/tripStore.ts`, `src/stores/mapStore.ts`  
**Problem**: Implementing F-10 (trip reset) or in-test isolation requires manually resetting each field. A single `reset()` action reduces fragility.  
**Fix**: Add idiomatic Pinia reset using initial-state snapshot:
```ts
function reset(): void { startDate.value = null; endDate.value = null; /* … */ }
```

---

## Section 3: Services & Business Logic

### ✅ Haversine Radian Conversion — VERIFIED SAFE
**File**: `src/utils/routingAlgorithm.ts:23-41`  
Degrees are correctly converted via `toRadians(deg) = (deg * Math.PI) / 180` before all trigonometric calls. The formula is mathematically correct. **This finding is a false positive and has been removed.**

---

### F3-1 🟡 Greedy algorithm accepts trips with a single game — no quality floor
**File**: `src/utils/routingAlgorithm.ts:129-199`, `src/services/routingService.ts:51-59`  
**Problem**: A 180-day window with only 1 matching game produces `qualityScore = 1` and is returned as a valid trip. Users will see a nearly empty itinerary with no UX warning.  
**Fix**: Add a minimum-games guard in `computeTrip`:
```ts
if (totalGamesAttended === 0) {
  return { trip: null, error: 'NO_GAMES', totalGamesAttended: 0, totalTravelDays: 0 };
}
```

---

### F3-2 🟡 Travel time uses fixed speed — unrealistic for cross-country
**File**: `src/utils/routingAlgorithm.ts:19-21, 89-93`  
**Problem**: `DRIVE_SPEED_KMH = 100` and `FLIGHT_SPEED_KMH = 800` are invariant constants. Cross-country routes (NYC→LA ~4500 km) underestimate total journey time. The threshold of 200 km for drive-vs-fly is also conservative.  
**Fix**: This is by design for a planning tool, but at minimum surface `estimatedTravelTime` to the user with a disclaimer label (e.g. "Approx. travel time").

---

### F3-3 🟡 `ScoredCandidate.score` can be negative — semantic confusion
**File**: `src/utils/routingAlgorithm.ts:113-118`  
**Problem**: `score = MAX_REACH_KM - distanceKm`. For any stadium further than 5 000 km (e.g. Toronto → LA is ~3 500 km, safe; but could matter for international edge cases) the score goes negative. The `reduce` max-pick still selects the best candidate correctly, but a negative score has no defined meaning in the type contract.  
**Fix**: Clip at zero, or make "unreachable" explicit:
```ts
score: Math.max(0, MAX_REACH_KM - distanceKm),
```

---

### F3-4 🔵 Stadium shape guard checks only 3 fields of 12
**File**: `src/services/stadiumService.ts:28-45`  
**Problem**: `isStadiumArray` validates `id`, `teamName`, `stadiumName`, and `coordinates.lat/lng` but skips `teamId` (critical for `buildStadiumByTeamIdMap`), `league`, `division`, etc. A malformed JSON entry with a missing `teamId` would silently produce an empty map entry.  
**Fix**: Add `typeof s['teamId'] !== 'string'` to the guard.

---

### F3-5 🔵 Stadium uniqueness not validated in shape guard
**File**: `src/services/stadiumService.ts:28-45`  
**Problem**: Duplicate `id` values in `stadiums.json` would silently overwrite earlier entries in `buildStadiumByIdMap`. No uniqueness check exists at load time.  
**Fix**:
```ts
const ids = new Set(data.map(s => s.id));
if (ids.size !== data.length) return false; // duplicate IDs
```

---

## Section 4: Composables

### ✅ `useGameFilter` `immediate: false` — VERIFIED SAFE IN CURRENT USAGE
**File**: `src/composables/useGameFilter.ts:165-170`  
`_tripGenId` starts at `0` (tripStore.ts:13) and `requestTripGeneration()` is the only writer. Since `useGameFilter` is mounted at App.vue's root and the watcher correctly skips the sentinel value `0`, no request is missed under normal lifecycle. **This is a false positive for the current architecture.**

⚠️ **Latent risk**: If `useGameFilter` is ever conditionally mounted (inside a `v-if`) after `requestTripGeneration()` has already been called (id > 0), the current watcher will miss the in-progress request. Document the mount-order invariant or add a `watchEffect` fallback.

---

### F4-1 🟡 `useRoutingAlgorithm.generatedTrip` duplicates `tripStore.selectedTrip` — two sources of truth
**File**: `src/composables/useRoutingAlgorithm.ts:20, 31, 69-70`  
**Problem**: The composable returns a local `generatedTrip` ref AND writes the same trip to `store.setSelectedTrip()`. In `App.vue`, `generatedTrip` is not even destructured — consumers must decide which source to read. The local ref adds memory overhead and confusion.  
**Fix**: Remove `generatedTrip` from the return interface. All consumers should read `tripStore.selectedTrip`.

---

### ✅ `useMapPolylines` `immediate: true` flicker — VERIFIED FALSE POSITIVE
**File**: `src/composables/useMapPolylines.ts:102-109`  
`isLoading` initialises as `false`. When `selectedTrip === null` on mount, `buildSegments` immediately sets `isLoading = false` (no state change). No flicker occurs. **Removed.**

---

### F4-2 🟡 `addDays` DST edge-case in `useDateRange`
**File**: `src/composables/useDateRange.ts:22-29`  
**Problem**: `toDate(iso)` uses `new Date(iso + 'T00:00:00')` (local midnight). `addDays` then calls `d.setDate(d.getDate() + days)`. On DST spring-forward night, `setDate` may land at 23:00 of the same calendar day, and the subsequent year/month/day read will still be correct because they read local parts — so `addDays` itself is safe. **However**, `diffDays` divides raw milliseconds by `86_400_000`: on the DST transition day (23h or 25h real hours) `Math.round` rescues it, but on a rare 30-min DST timezone the result could be ±1.  
**Fix**: Align with the DST-safe `daysBetween` pattern in `routingAlgorithm.ts` (local Date constructor from parsed parts).

---

### F4-3 🔵 Refs returned from composables are not `readonly`
**File**: `src/composables/useGameFilter.ts:97-103`, `src/composables/useMapPolylines.ts:10-14`  
**Problem**: `filteredGames`, `segments`, and other returned refs are mutable from outside the composable, breaking encapsulation. A consumer could accidentally overwrite the composable's internal state.  
**Fix**: Type returns as `Readonly<Ref<T>>` or use `computed(() => internalRef.value)`.

---

### ✅ `useGameFilter` silent duplicate drop — VERIFIED FALSE POSITIVE
**File**: `src/composables/useGameFilter.ts:156-162`  
A DEV-mode `console.warn` for removed duplicates is already implemented. **Removed.**

---

## Section 5: Vue Components

### F5-1 🟡 Tile error fires `mapStore.setError()` per tile — reactive spam
**File**: `src/components/map/MapViewContainer.vue:48-50`  
**Problem**: On a poor connection a single map viewport can fail 20-50 tiles simultaneously. Each calls `mapStore.setError(...)`, triggering a Pinia reactive write and potentially 20-50 re-renders of `MapErrorBanner`.  
**Fix**:
```ts
tileLayer.on('tileerror', () => {
  if (!mapStore.hasError) {
    mapStore.setError('Map tiles unavailable. Check your internet connection.');
  }
});
```

---

### F5-2 🟡 `App.vue` hardcodes `padding-top: 64px` — breaks on mobile
**File**: `src/App.vue:77`  
**Problem**: `v-main` from Vuetify already computes its top-padding from the registered app-bar height via CSS custom properties (`--v-layout-top`). Adding `padding-top: 64px` via a scoped class overrides or double-applies the offset. Vuetify's `v-app-bar` shrinks to 56px on mobile breakpoints, causing visible layout gaps.  
**Fix**: Remove the manual `padding-top` from `.main-content` and let Vuetify's layout system manage offsets. If custom padding is needed, use `padding-top: var(--v-layout-top)`.

---

### F5-3 🟡 `DateRangePicker` not disabled during `isBusy`
**File**: `src/App.vue:58`  
**Problem**: `QuickStartPresets` and `StadiumSelector` both receive `:disabled="isBusy"`, but `DateRangePicker` does not. A user can modify dates mid-generation, triggering a new routing run that races the in-flight one (the race guard will abort the old request, but the UX is jarring).  
**Fix**: Pass `:readonly="isBusy"` to `DateRangePicker` (the component already has a `readonly` prop).

---

### F5-4 🔵 `PresetBadge` missing `aria-pressed` attribute
**Problem**: Toggle-style badge buttons should expose pressed state to screen readers via `aria-pressed="true/false"`.  
**Fix**: Bind `:aria-pressed="isActive"` on the root button element of `PresetBadge.vue`.

---

### F5-5 🔵 `.map-container` lacks `min-height` — Leaflet renders invisible
**File**: `src/components/map/MapViewContainer.vue:98-100`  
**Problem**: `.map-wrapper` has `min-height: 400px`, but `.map-container` (the element passed to `L.map()`) only has `height: 100%`. If the wrapper's height collapses (e.g., during SSR hydration or abnormal flex layout), Leaflet renders a 0px container.  
**Fix**: Add `min-height: 400px` to `.map-container` as a safety net.

---

## Section 6: Testing Coverage

### F6-1 🟡 Race condition test missing for `useMapPolylines`
**Problem**: `useGameFilter` and `useRoutingAlgorithm` have documented race-condition protection (requestCounter pattern) but the test suite does not exercise rapid sequential trip changes for `useMapPolylines`. A test that sets `selectedTrip` twice in quick succession should verify that only the final result is committed.

---

### F6-2 🔵 Keyboard interaction not tested for `PresetBadge`
**Problem**: The Enter/Space keypress path on `PresetBadge` buttons is not covered by component tests. Accessibility regressions (e.g., a future CSS-only button replacement losing native keyboard semantics) would not be caught.

---

### F6-3 🔵 Haversine tests use exact equality
**File**: `src/services/__tests__/` (reported, unverified line)  
**Problem**: Floating-point Haversine results should use `toBeCloseTo(expected, decimalPlaces)` rather than `toBe(exact)`. Different JS engine optimisations can produce sub-epsilon variations.  
**Fix**: `expect(haversineDistance(a, b)).toBeCloseTo(3940, 0);`

---

## Consolidated Finding Summary

| # | Severity | Layer | Issue | File |
|---|---|---|---|---|
| 1 | 🟡 Warning | State | `tripStore.error` exposed but never written — dead state | `tripStore.ts:12` |
| 2 | 🟡 Warning | State | `mapStore.center/zoom` not synced back from Leaflet user events | `MapViewContainer.vue:30` |
| 3 | 🟡 Warning | Types | `UiState` interface defined but never used | `models.ts:133` |
| 4 | 🟡 Warning | Types | `MapViewState` interface defined but never used | `map.ts:38` |
| 5 | 🟡 Warning | Types | `MapPolylineLayerProps` duplicated in types and component | `components.ts:94`, `MapPolylineLayer.vue:8` |
| 6 | 🟡 Warning | Services | Greedy algorithm accepts trips with 0 attended games | `routingAlgorithm.ts:178` |
| 7 | 🟡 Warning | Services | Travel time uses fixed speed constants, no UX disclaimer | `routingAlgorithm.ts:89` |
| 8 | 🟡 Warning | Composables | `generatedTrip` duplicates `tripStore.selectedTrip` — two sources of truth | `useRoutingAlgorithm.ts:20` |
| 9 | 🟡 Warning | Composables | `addDays` / `diffDays` DST edge-case in UTC±30min timezones | `useDateRange.ts:22` |
| 10 | 🟡 Warning | Composables | `immediate: false` creates latent risk if composable is conditionally mounted | `useGameFilter.ts:169` |
| 11 | 🟡 Warning | Components | Tile error calls `setError()` per tile — reactive spam on slow connection | `MapViewContainer.vue:48` |
| 12 | 🟡 Warning | Components | `App.vue` hardcodes `padding-top: 64px` — layout breaks on mobile | `App.vue:77` |
| 13 | 🟡 Warning | Components | `DateRangePicker` not disabled during `isBusy` — mid-generation edits possible | `App.vue:58` |
| 14 | 🟡 Warning | Testing | Race condition not tested for `useMapPolylines` rapid trip changes | `useMapPolylines.ts` |
| 15 | 🔵 Info | Types | `Game.series` uses anonymous inline type — should be named `GameSeries` | `models.ts:36` |
| 16 | 🔵 Info | State | No `reset()` action in `tripStore` or `mapStore` | `tripStore.ts`, `mapStore.ts` |
| 17 | 🔵 Info | Services | `ScoredCandidate.score` can be negative — clip to 0 for semantic clarity | `routingAlgorithm.ts:115` |
| 18 | 🔵 Info | Services | Stadium shape guard checks only 3 of 12 fields; missing `teamId` | `stadiumService.ts:30` |
| 19 | 🔵 Info | Services | Stadium uniqueness not validated — duplicate IDs silently overwrite map | `stadiumService.ts:28` |
| 20 | 🔵 Info | Composables | Returned refs not typed as `Readonly<Ref<T>>` — external mutation possible | `useGameFilter.ts:97` |
| 21 | 🔵 Info | Components | `PresetBadge` missing `aria-pressed` — screen-reader state not communicated | `PresetBadge.vue` |
| 22 | 🔵 Info | Components | `.map-container` has no `min-height` — Leaflet can render 0px on flex collapse | `MapViewContainer.vue:98` |
| 23 | 🔵 Info | Build | Vuetify imports all 120+ components globally — significant bundle overhead | `main.ts:11` |
| 24 | 🔵 Info | Build | No `app.config.errorHandler` — unhandled Vue errors lost in production | `main.ts:38` |
| 25 | 🔵 Info | Testing | Haversine unit tests use exact equality instead of `toBeCloseTo` | service `__tests__` |
| 26 | 🔵 Info | Testing | Keyboard interaction (Enter/Space) not tested on `PresetBadge` | component tests |

---

## Recommended Fix Priority

### 🟡 Fix Within Current Sprint

1. **`tripStore.error` dead state** — Consumers may react to it expecting eventual error info; remove from public API or wire it up before adding more features that depend on store errors. *(tripStore.ts:12)*
2. **`mapStore` not synced from Leaflet** — Any future "share route" or "restore view" feature will silently read stale coordinates. Two-line fix in `onMounted`. *(MapViewContainer.vue)*
3. **Tile error reactive spam** — Under real mobile network conditions this causes perceptible jank. One-line guard fix. *(MapViewContainer.vue:48)*
4. **`DateRangePicker` not disabled during `isBusy`** — Easy to reproduce: apply preset, immediately pick new dates. Causes a wasted routing request. *(App.vue:58)*
5. **`App.vue` `padding-top: 64px`** — Actively breaks layout on mobile where the app bar is 56px. Replace with `var(--v-layout-top)`. *(App.vue:77)*
6. **Greedy accepts 0-attended-game trips** — Without a floor, the algorithm can return a trip that is entirely `travel_day` entries, confusing the user. *(routingService.ts)*
7. **`generatedTrip` duplicate source of truth** — Before any new consumer is written, consolidate to `tripStore.selectedTrip` and remove the composable return. *(useRoutingAlgorithm.ts:20)*
8. **Orphaned `UiState` / `MapViewState`** — Remove or adopt. Orphan types accumulate confusion as the codebase grows. *(models.ts, map.ts)*
9. **`MapPolylineLayerProps` duplicate** — Import from types; keep one definition. *(MapPolylineLayer.vue:8)*
10. **Race condition test for `useMapPolylines`** — Adds test coverage for an already-implemented guard. *(test suite)*

### 🔵 Tech Debt Backlog

1. **Vuetify tree-shaking** — Replace `import * as components` with individual imports or use `vuetify/vite-plugin` with `autoImport: true` to cut bundle size significantly. *(main.ts)*
2. **`app.config.errorHandler`** — Add Sentry/LogRocket hook or at minimum a console sink to capture unhandled Vue errors in production.
3. **Stadium shape guard completeness** — Add `teamId` check; add uniqueness validation. *(stadiumService.ts)*
4. **`score` negative clip** — Minor semantic fix; zero-cost. *(routingAlgorithm.ts:115)*
5. **`Readonly<Ref<T>>` return types** — Prevents external composable state mutation; apply during next refactor pass.
6. **`Game.series` named interface** — Improve re-usability and guard expressiveness.
7. **Store `reset()` actions** — Required before implementing F-10 (trip reset flow).
8. **`PresetBadge` `aria-pressed`** — Accessibility hardening; one attribute.
9. **Haversine tests `toBeCloseTo`** — Prevents false test failures across different JS runtime versions.
10. **`addDays` / `diffDays` DST hardening** — Low-probability but correctness risk for users in GMT±0:30 / GMT±5:30 zones.

---

## Positive Observations

- **Request-counter race-condition pattern** is applied consistently across all three async composables (`useGameFilter`, `useRoutingAlgorithm`, `useMapPolylines`), with both a version-stamp guard and an `isMounted` unmount guard. This is production-grade defensive async code.
- **Pure algorithm functions** in `routingAlgorithm.ts` are fully decoupled from Vue/Pinia, making them trivially testable and safe to move to a Web Worker in the future.
- **Typed error codes** (never `throw`) across all service functions mean every error path is statically visible to callers — no silent exceptions.
- **Haversine implementation** is mathematically correct: `toRadians` is applied consistently to all degree inputs, and the chord formula uses the correct asin-sqrt pattern.
- **`deduplicateByGameId` DEV warning** is already implemented — the silent-duplicate-drop finding was a false positive; the team already thought of it.
- **Module-level stadium cache** in `stadiumService` prevents redundant JSON parses across all callers in the same app session.
- **`formatDateLocal` and `daysBetween`** in `routingAlgorithm.ts` correctly use local Date constructors to avoid the UTC timezone off-by-one that is a common source of bugs in date-range tools.
