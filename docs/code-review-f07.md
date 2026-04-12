# Expert Code Review — F-07 Interactive Markers
**Date**: 2026-04-12  
**Scope**: F-07 (Interactive Markers) — `useStadiumMarkers`, `MapMarkerLayer.vue`, `markerIconUtils.ts`, `popupContentUtils.ts`, `tooltipContentUtils.ts`, `src/types/map.ts`, `src/assets/main.css`, integration points in `MapViewContainer.vue` and `App.vue`  
**Reviewer**: GitHub Copilot (claude-sonnet-4.6)

---

## Executive Summary

F-07 is well-implemented overall: the component mirrors the established `MapPolylineLayer` pattern (inject map key → imperatively manage a `LayerGroup` → cleanup in `onBeforeUnmount`), the composable applies the project's race-condition counter pattern correctly, and the XSS escaping in `popupContentUtils` is thorough for its threat model. No correctness-critical bugs were found.

The three most actionable issues are:

1. **`useStadiumMarkers().isLoading` is invisible to the UI** — on first app load, 30 stadium markers fetch silently with no loading overlay (🟡 W1)
2. **A misleading comment in `tooltipContentUtils.ts` claims Leaflet auto-escapes HTML** — it does not; future developers may inadvertently introduce XSS by trusting that comment (🟡 W2)
3. **Routing errors are silently swallowed when tile errors co-occur** — the `MapErrorBanner` message ternary has implicit priority that hides the routing error message (🟡 W3)

---

## Severity Legend

| Symbol | Meaning |
|---|---|
| 🔴 Critical | Bug that causes incorrect behavior or data loss |
| 🟡 Warning | Risk of bug, degraded UX, or future maintainability problem |
| 🔵 Info | Best-practice deviation, minor improvement opportunity |

---

## Section 1: Composable — `useStadiumMarkers.ts`

### F7-1 🟡 `isLoading` not surfaced to `isBusy` — silent first-load
**File**: `src/composables/useStadiumMarkers.ts:21`, `src/components/map/MapViewContainer.vue:25`, `src/App.vue:21`  
**Problem**: `useStadiumMarkers` returns `isLoading`, but `MapViewContainer` only destructures `{ markers, error: markerError }`. The loading state is never threaded up to `App.vue`'s `isBusy` computed. On first page load, all 30 stadium markers are fetched asynchronously while the map displays an empty base layer with no loading indicator — a confusing "flash of no content."

```typescript
// MapViewContainer.vue — current
const { markers, error: markerError } = useStadiumMarkers();

// App.vue — current
const isBusy = computed(() => isFiltering.value || isRouting.value);
// ← markerIsLoading never included
```

**Fix Option A** (simplest) — absorb into `MapViewContainer`'s existing loading overlay by merging the local `isLoading` prop with `markerIsLoading`:
```typescript
// MapViewContainer.vue
const { markers, error: markerError, isLoading: markerIsLoading } = useStadiumMarkers();

// Then in template:
// :is-loading="isLoading || mapStore.isLoading || markerIsLoading"
```

**Fix Option B** — emit a `@marker-loading` event from `MapViewContainer` and merge it in `App.vue`. Preferred only if App.vue needs to block the control panel during marker loading (it doesn't today).

---

### F7-2 🟡 `isLoading` left `true` on race-guard early exit (`!isMounted` branch)
**File**: `src/composables/useStadiumMarkers.ts:34`  
**Problem**: When the `!isMounted` branch of the race guard fires (component unmounts mid-request), `isLoading` is left `true` on the orphaned ref. While this is harmless (the ref will be garbage-collected), the pattern diverges from the `loadError` and normal-completion paths which always reset `isLoading = false`. If this composable is ever used in a keep-alive context or extracted into a singleton store, the stuck state becomes observable.

```typescript
// current — L34
if (!isMounted || requestId !== requestCounter) return; // ← isLoading never cleared
```

**Fix**: Split the two conditions so the unmount path explicitly resets state:
```typescript
if (!isMounted) {
  isLoading.value = false; // component gone; clean up before abandoning
  return;
}
if (requestId !== requestCounter) return; // winning request will reset isLoading
```

---

### F7-3 🔵 Always calls `loadStadiums()` even when `selectedTrip` is cleared to `null`
**File**: `src/composables/useStadiumMarkers.ts:92–99`  
**Problem**: `useMapPolylines` short-circuits immediately when `trip === null`, but `useStadiumMarkers` always goes through the full `await loadStadiums()` cycle — even when the trip is cleared and all markers will just be `'unscheduled'`. On a warm cache this costs only one microtask, but it makes test #5 in `useStadiumMarkers.spec.ts` manually clear the cache mid-test to force a re-load, which is a test-smell revealing the extra work.

```typescript
// Suggested optimization (inside buildMarkers, before the await):
const trip   = selectedTrip.value;
const homeId = homeStadiumId.value;

if (trip === null && homeId === null) {
  // Fast path: no trip, no home selection → all stadiums are unscheduled
  // Still need stadiums list for coordinates, so cannot skip loadStadiums entirely,
  // but we can note this is a no-op for status resolution.
}
// Full short-circuit only possible if we cache the stadium list separately.
```

This is minor; the current approach is safe, just slightly redundant.

---

## Section 2: Component — `MapMarkerLayer.vue`

### F7-4 🔵 `watch` on `props.markers` with `{ deep: false }` relies on referential replacement
**File**: `src/components/map/MapMarkerLayer.vue:55–59`  
**Problem**: The watch fires only when the `props.markers` array reference changes. This works correctly today because `useStadiumMarkers` always assigns `markers.value = result` (a new array on every build). If a future refactor were to mutate individual marker `status` properties in-place rather than replacing the array, this watch would silently not fire and the map would show stale marker icons.

```typescript
// current
watch(
  () => props.markers,
  () => { drawMarkers(); },
  { deep: false },  // ← depends on new-array-per-update contract
);
```

**Fix**: Add a comment documenting the contract so the dependency is explicit, or switch to `{ deep: true }` with a note that `useStadiumMarkers` always replaces the array:
```typescript
// Contract: useStadiumMarkers always replaces markers.value (never mutates in-place).
// deep: false is intentional for performance — O(1) reference check vs O(n) deep compare.
watch(() => props.markers, () => { drawMarkers(); }, { deep: false });
```

---

### F7-5 🔵 `onMounted` draws empty layer on first render
**File**: `src/components/map/MapMarkerLayer.vue:51–53`  
**Problem**: `MapMarkerLayer` is rendered inside `<template v-if="mapInstance">` in `MapViewContainer`. When it mounts, `props.markers` is almost always `[]` because `useStadiumMarkers`'s first `buildMarkers` is still awaiting `loadStadiums()`. `onMounted` calls `drawMarkers()` which creates a `LayerGroup` containing zero markers (a no-op layer group). This is harmless but wastes one Leaflet API call.

The subsequent `watch` fires when `markers.value` is populated and correctly redraws. The net effect is one extra `L.layerGroup().addTo(map)` call per mount.

**Fix** (optional): Guard the `onMounted` call:
```typescript
onMounted(() => {
  if (props.markers.length > 0) drawMarkers();
});
```

---

## Section 3: Utilities

### F7-6 🟡 `tooltipContentUtils.ts` — misleading comment about Leaflet auto-escaping
**File**: `src/utils/tooltipContentUtils.ts`  
**Problem**: A comment in the file (or associated documentation) claims that Leaflet's `bindTooltip` auto-escapes HTML. This is **factually incorrect**. Leaflet's `L.Tooltip` sets its content via `container.innerHTML = content`, meaning any HTML tags in the tooltip string will be interpreted as markup, not escaped.

Currently `buildTooltipText()` returns only plain text (stadium name, city, state) so there is no active XSS risk. However, the misleading comment is a maintenance hazard: a future developer who trusts it and passes user-controlled text directly to `bindTooltip()` would introduce XSS.

**Fix**: Correct the comment and apply the same `escapeHtml` logic used in `popupContentUtils.ts`:
```typescript
// ⚠️  Leaflet renders tooltip content via innerHTML — NOT auto-escaped.
// Keep output to plain text and escape any dynamic data:
export function buildTooltipText(data: StadiumMarkerData): string {
  const name  = escapeHtml(data.stadiumName);   // reuse or duplicate from popupContentUtils
  const place = `${escapeHtml(data.city)}, ${escapeHtml(data.state)}`;
  return `${name} — ${place}`;
}
```

Since `escapeHtml` is currently private to `popupContentUtils.ts`, either export it or move it to a shared `src/utils/htmlUtils.ts`.

---

### F7-7 🔵 `popupContentUtils.ts` — `escapeHtml` does not block `javascript:` URL protocol
**File**: `src/utils/popupContentUtils.ts` (private `escapeHtml`)  
**Problem**: The `escapeHtml` function escapes `&`, `<`, `>`, `"`, `'` — sufficient for preventing HTML tag injection. However, it does not strip the `javascript:` URL protocol. If `data.logoUrl` or `data.stadiumPhotoUrl` ever contained `javascript:alert(1)`, the output would be:

```html
<img src="javascript:alert(1)" onerror="this.style.display='none'">
```

Modern browsers do NOT execute `javascript:` in `<img src>` (only in `<a href>` and `<script src>`), so **this is not an active vulnerability**. It is, however, worth documenting clearly in the function's comment since the threat model is "static bundled JSON data" — if the data source ever becomes user-controlled, the risk becomes real.

**Recommended comment addition**:
```typescript
/**
 * Escapes HTML special characters for use in text nodes and attribute values.
 * Note: does NOT sanitise javascript: URLs — safe only for static data sources.
 * For user-controlled URLs, add a protocol allowlist (https:, http: only).
 */
function escapeHtml(str: string): string { ... }
```

---

### F7-8 🔵 `popupContentUtils.ts` — inline `onerror` handler and future CSP compatibility
**File**: `src/utils/popupContentUtils.ts` (inside `buildPopupHtml`)  
**Problem**: The popup HTML uses inline event handlers:
```html
<img onerror="this.style.display='none'" ...>
```
Inline event handlers are blocked by a `Content-Security-Policy: script-src 'self'` directive (without `unsafe-inline`). If a CSP header is ever added (GitHub Pages supports this via `_headers`), all popup images would fail silently when their `onerror` tries to fire.

**Fix**: Replace with a CSS-only approach. Add a CSS rule that hides broken images:
```css
/* main.css — detects broken images via :not([complete]) or the img[src]="" selector */
.stadium-popup img[alt]:after { display: none; }
```
Or more robustly, use Leaflet's popup `className` hook to inject the popup into a `MutationObserver` that adds error handlers via `addEventListener`. This is a non-trivial refactor — acceptable to defer unless a CSP is actually planned.

---

## Section 4: Type System

### F7-9 🔵 `StadiumMarkerData.teamNickname` defined but unused in UI utilities
**File**: `src/types/map.ts:22`, `src/utils/popupContentUtils.ts`, `src/utils/tooltipContentUtils.ts`  
**Problem**: `teamNickname` (e.g., `"Yankees"`) is mapped in `useStadiumMarkers` and included in `StadiumMarkerData`, but neither `buildPopupHtml` nor `buildTooltipText` uses it. The popup displays `teamName` (`"New York Yankees"`) which is verbose; `teamNickname` would be more compact for the constrained 240px popup width.

**Options**:
- Use `teamNickname` in the popup subtitle or tooltip
- Remove it from the interface if no planned use exists

---

### F7-10 🔵 Section order mismatch in `src/types/components.ts`
**File**: `src/types/components.ts:94–103`  
**Problem**: F-07's `MapMarkerLayerProps` appears **before** F-06's `MapPolylineLayerProps` even though F-06 was implemented first:
```typescript
// ── F-07: Map Marker Layer ─────────────────────────────────────────  ← newer
export interface MapMarkerLayerProps { ... }

// ── F-06: Map Polyline Layer ───────────────────────────────────────  ← older
export interface MapPolylineLayerProps { ... }
```
Swap the order so F-06 precedes F-07, matching feature-implementation order and `plan.md` numbering.

---

## Section 5: Integration — `MapViewContainer.vue` & `App.vue`

### F7-11 🟡 `MapErrorBanner` silently drops routing error when tile error is active
**File**: `src/components/map/MapViewContainer.vue` (template, error banner binding)  
**Problem**: The `:message` binding uses a priority chain:
```
mapStore.hasError → tile error message
  ↓ else
markerError → stadium load error
  ↓ else
errorMsg → routing error (from App.vue)
```
When both `mapStore.hasError` and `errorMsg` are truthy simultaneously (tile load failed AND routing failed), only the tile error is shown. The user sees "Map tiles unavailable" but has no indication that the routing also failed — they may not know why no itinerary appeared.

This is low severity for an MVP (two simultaneous errors are rare), but worth documenting.

**Fix**: Concatenate or queue multiple error messages, or show a secondary banner. Minimal fix — change priority to prefer routing errors (which block user action) over tile errors (cosmetic):
```typescript
// Revised priority: routing > marker load > tile
const displayError = computed(() =>
  errorMsg ?? markerError ?? (mapStore.hasError ? (mapStore.errorMsg ?? 'Map error') : null)
);
```

---

## Section 6: Test Coverage

### F7-12 🔵 No unit tests for `tooltipContentUtils.ts`
**File**: `src/utils/tooltipContentUtils.ts` (no matching `__tests__` file)  
**Problem**: `buildTooltipText` is the only exported utility without a test. Even a single smoke test would prevent regressions:

```typescript
// Suggested: src/utils/__tests__/tooltipContentUtils.spec.ts
describe('buildTooltipText()', () => {
  it('includes stadiumName in output', () => {
    expect(buildTooltipText(BASE_MARKER)).toContain('Yankee Stadium');
  });
  it('includes city and state in output', () => {
    expect(buildTooltipText(BASE_MARKER)).toContain('New York');
    expect(buildTooltipText(BASE_MARKER)).toContain('NY');
  });
});
```

---

### F7-13 🔵 No lifecycle test for `MapMarkerLayer.vue` component
**File**: `src/components/map/MapMarkerLayer.vue`  
**Problem**: The imperative Leaflet DOM management (mount → `layerGroup` created, prop change → `clearLayers` called, unmount → `layerGroup.remove()`) is tested only indirectly. A component test with a mocked Leaflet map (following `MapPolylineLayer`'s test pattern, if one exists) would catch lifecycle regressions.

---

### F7-14 🔵 `useStadiumMarkers` test #5 requires mid-test cache manipulation
**File**: `src/composables/__tests__/useStadiumMarkers.spec.ts:215–216`  
**Problem**: Test #5 ("reverts all markers to unscheduled when trip is cleared") calls `_clearStadiumCache()` and `_setStadiumJsonLoader()` in the middle of the test body. This is a test smell: it reveals that `useStadiumMarkers` makes a second `loadStadiums()` call even when `selectedTrip = null`, and without cache-clearing the second call would return cached data without re-running the watcher trigger.

The composable itself is correct; the test smell just flags the "always-load" pattern noted in F7-3. No fix needed — documenting for awareness.

---

## Summary Table

| ID | Severity | File | Issue |
|---|---|---|---|
| F7-1 | 🟡 | `useStadiumMarkers.ts`, `MapViewContainer.vue`, `App.vue` | `isLoading` not surfaced → silent first-load |
| F7-2 | 🟡 | `useStadiumMarkers.ts:34` | `isLoading` left `true` on `!isMounted` early exit |
| F7-3 | 🔵 | `useStadiumMarkers.ts:92` | Always calls `loadStadiums()` even when trip cleared |
| F7-4 | 🔵 | `MapMarkerLayer.vue:55` | `deep: false` watch relies on undocumented new-array contract |
| F7-5 | 🔵 | `MapMarkerLayer.vue:51` | `onMounted` draws empty layer group on first render |
| F7-6 | 🟡 | `tooltipContentUtils.ts` | Misleading comment: Leaflet does NOT auto-escape innerHTML |
| F7-7 | 🔵 | `popupContentUtils.ts` | `escapeHtml` does not block `javascript:` URL protocol |
| F7-8 | 🔵 | `popupContentUtils.ts` | Inline `onerror` handlers block future CSP adoption |
| F7-9 | 🔵 | `types/map.ts:22` | `teamNickname` mapped but unused in UI utilities |
| F7-10 | 🔵 | `types/components.ts:94` | F-07 section appears before F-06 (reverse order) |
| F7-11 | 🟡 | `MapViewContainer.vue` | Routing error silently dropped when tile error co-occurs |
| F7-12 | 🔵 | `tooltipContentUtils.ts` | No unit tests |
| F7-13 | 🔵 | `MapMarkerLayer.vue` | No lifecycle tests |
| F7-14 | 🔵 | `useStadiumMarkers.spec.ts:215` | Test #5 requires mid-test cache manipulation (test smell) |

**Total**: 0 🔴 Critical / 3 🟡 Warning / 11 🔵 Info

---

## Recommended Fix Priority

1. **F7-6** — Fix the misleading Leaflet escaping comment to prevent future XSS (5 min)
2. **F7-1** — Surface `markerIsLoading` into `MapViewContainer`'s loading overlay (15 min)
3. **F7-2** — Reset `isLoading = false` in the `!isMounted` early-exit path (2 min)
4. **F7-11** — Fix error priority ternary so routing errors are visible (5 min)
5. **F7-12** — Add smoke tests for `tooltipContentUtils.ts` (15 min)
6. **F7-4** — Add comment documenting the new-array contract (2 min)
7. **F7-10** — Reorder F-06/F-07 sections in `components.ts` (1 min)
