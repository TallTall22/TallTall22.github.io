# F-09: 聯動高亮 (Cross-Highlight Interaction) — BDD Task Breakdown

## Executive Summary

**What**: Bidirectional hover-highlight between the Timeline Strip (F-08) and the Map Markers/Polylines (F-07). Hovering a timeline card highlights the corresponding map marker + polylines, and vice versa.  
**Why**: Dramatically improves UX by visually connecting the list view (timeline) with the spatial view (map) — a core affordance for trip planning tools.  
**Scope IN**: hover-triggered highlight only; no click-to-select; no persistent selection state.  
**Scope OUT**: Mobile touch events (handled by CSS hover fallback), keyboard navigation (out of MVP scope).

---

## Given-When-Then Scenarios

### Scenario 1: Timeline → Map highlight (F-09.1 + F-09.2 + F-09.3)

- **Given**: A trip is generated; timeline cards and map markers are visible.
- **When**: User hovers a timeline card (game_day or travel_day with a stadiumId).
- **Then**:
  - The hovered card shows an MLB-blue active outline (already supported via `isActive` prop).
  - The corresponding map marker enlarges and pulses (highlighted icon).
  - All polyline segments connected to that stadium become gold/thick.
  - On mouseleave, all visual states revert instantly.

### Scenario 2: Map → Timeline reverse highlight (F-09.4)

- **Given**: A trip is generated; timeline cards and map markers are visible.
- **When**: User hovers a Leaflet map marker.
- **Then**:
  - The corresponding timeline card(s) show active outline.
  - Connected polyline segments are highlighted.
  - On mouseout from marker, all visual states revert.

### Scenario 3: No trip — no cross-highlight

- **Given**: No trip has been generated (selectedTrip is null).
- **When**: User hovers anything.
- **Then**: No highlight state set; no errors thrown.

### Scenario 4: Multiple timeline entries for same stadium

- **Given**: A stadium appears multiple times in the itinerary (e.g., 2 game days at NYY).
- **When**: User hovers either card or the map marker for NYY.
- **Then**: ALL NYY timeline cards activate; the NYY marker and all its connected segments highlight.

---

## Technical Feasibility Assessment

| Concern           | Finding                                             | Mitigation                                               |
|-------------------|-----------------------------------------------------|----------------------------------------------------------|
| Shared state      | Timeline + Map are sibling subtrees under App.vue   | Thin Pinia `highlightStore` — single source of truth     |
| Race condition    | Rapid mouse movement fires many enter/leave events  | Ref mutation is synchronous — no debounce needed         |
| Leaflet API       | Markers require `setIcon()` to update visual state  | Track `Map<stadiumId, L.Marker>` in MapMarkerLayer        |
| Type safety       | `MapPolylineSegment` lacks stadiumId fields         | Extend interface; update `useMapPolylines` mapper        |
| `TimelineDayViewModel` lacks `stadiumId` | Can't cross-link without it   | Add `stadiumId: string \| null` field                    |
| Memory leak       | Leaflet event listeners not cleaned on unmount      | Clean in existing `onBeforeUnmount` hook                 |
| Prop drilling     | Highlight state needed in MapMarkerLayer/Polyline   | Direct store read (no prop needed — same depth level)    |
| Highlight + status| Markers have `MarkerStatus`; highlight is orthogonal | Add `createHighlightedMarkerDivIcon()` variant in utils  |

---

## Task Breakdown & Atomic Decomposition

### ✅ Phase 1: Type System & Data Contracts

**1.1** `src/types/components.ts` — Add `stadiumId: string | null` to `TimelineDayViewModel` *(~30min)*
- Required for Timeline→Map cross-link
- Add after `distanceKm` field
- Update JSDoc comment

**1.2** `src/types/map.ts` — Add `fromStadiumId: string` and `toStadiumId: string` to `MapPolylineSegment` *(~30min)*
- Required so MapPolylineLayer can identify which segments to highlight
- Both fields are `readonly string`

---

### ✅ Phase 2: State Layer

**2.1** `src/stores/highlightStore.ts` — Create highlight Pinia store *(~30min)*
```typescript
// Pinia Setup Store pattern
const hoveredStadiumId = ref<string | null>(null);
function setHovered(id: string): void
function clearHovered(): void
```
- Zero dependencies on other stores
- Export `useHighlightStore`

---

### ✅ Phase 3: Composable/Service Updates

**3.1** `src/composables/useTimeline.ts` — Populate `stadiumId` in `mapTripDayToViewModel()` *(~30min)*
- `game_day`: return `day.stadiumId`
- `travel_day`: return `day.stadiumId ?? null`

**3.2** `src/composables/useMapPolylines.ts` — Populate `fromStadiumId`/`toStadiumId` in segment builder *(~30min)*
- Add to `result.push({...})` call: `fromStadiumId: fromId, toStadiumId: toId`

---

### ✅ Phase 4: Utility Updates

**4.1** `src/utils/markerIconUtils.ts` — Add `createHighlightedMarkerDivIcon(status)` *(~45min)*
- Highlighted icon: 1.6× normal size, gold (#FFD700) ring border, scale-up CSS animation (`mlb-marker--highlighted`)
- Add CSS keyframe as part of the `html` string or a global style injection approach
- Return a new `L.DivIcon` with appropriate size/anchor/popup anchors

---

### ✅ Phase 5: Component Implementations

**5.1** `src/components/timeline/TripTimelineStrip.vue` — Wire hover → store; pass `isActive` *(~45min)*
- Import `useHighlightStore`
- Wrap each `TripTimelineCard` in a `<div>` with `@mouseenter`/`@mouseleave`
- Compute `isActive`: `highlightStore.hoveredStadiumId === day.stadiumId && day.stadiumId !== null`
- `@mouseenter`: `highlightStore.setHovered(day.stadiumId!)` (only when stadiumId non-null)
- `@mouseleave`: `highlightStore.clearHovered()`

**5.2** `src/components/map/MapMarkerLayer.vue` — Add hover events + react to highlight state *(~1h)*
- Track markers: add `markerByStadiumId = new Map<string, L.Marker>()` in layer scope
- In `drawMarkers()` loop: after creating marker, add to map
- Register `mouseover`: `highlightStore.setHovered(data.stadiumId)`
- Register `mouseout`: `highlightStore.clearHovered()`
- Add `watch(highlightStore.hoveredStadiumId ref, ...)` → `updateHighlight(prev, next)` 
  - `updateHighlight()`: call `setIcon` on prev marker (restore) and next marker (highlight)
- In `onBeforeUnmount()`: existing cleanup already covers this (layerGroup.remove())

**5.3** `src/components/map/MapPolylineLayer.vue` — React to hoveredStadiumId *(~45min)*
- Import `useHighlightStore`, watch `hoveredStadiumId`
- Change `drawSegments()` to accept optional `highlightedStadiumId: string | null`
- For highlighted segments: `weight: 5, color: '#FFD700', opacity: 1, dashArray: undefined`
- Watch `hoveredStadiumId` (from store) → call `drawSegments()` to re-render

---

### ✅ Phase 6: Tests

**6.1** `src/stores/__tests__/highlightStore.spec.ts` — Unit tests for highlight store *(~45min)*
- `setHovered` sets `hoveredStadiumId`
- `clearHovered` resets to null
- Initial state is null

**6.2** Update `src/components/timeline/__tests__/TripTimelineStrip.spec.ts` *(~1h)*
- Mock `useHighlightStore` (or use real Pinia)
- Test: mouseenter on card → `setHovered` called with correct stadiumId
- Test: mouseleave on card → `clearHovered` called
- Test: `isActive` prop passed correctly when `hoveredStadiumId` matches

**6.3** Update `src/composables/__tests__/useTimeline.spec.ts` *(~30min)*
- Assert `stadiumId` field is present in `TimelineDayViewModel` for both game_day and travel_day

**6.4** Update `src/composables/__tests__/useMapPolylines.spec.ts` *(~30min)*
- Assert `fromStadiumId` and `toStadiumId` fields are correct in each segment

---

## ✅ Verification — DONE (2026-04-12)

- `npm run type-check` → **0 errors**
- `npm run test -- --run` → **346 tests, 27 files, all passed**

---

## Implementation Order & Critical Path

```
Phase 1 (Types: 1h) — blocks everything
  ↓
Phase 2 (Store: 0.5h) + Phase 3 (Composable: 1h) — parallel
  ↓
Phase 4 (Utils: 0.75h) — depends on types only
  ↓
Phase 5 (Components: 2.5h) — depends on store + utils
  ↓
Phase 6 (Tests: 2.75h) — depends on all above
```

**Total**: ~8.5h sequential / ~6h optimized parallel

---

## Acceptance Criteria

- [ ] **1.1**: `TimelineDayViewModel.stadiumId` present, zero `any`
- [ ] **1.2**: `MapPolylineSegment.fromStadiumId`/`toStadiumId` present, readonly
- [ ] **2.1**: `highlightStore` compiles, `setHovered`/`clearHovered` work
- [ ] **3.1**: `useTimeline` populates `stadiumId` correctly for both day types
- [ ] **3.2**: `useMapPolylines` segments include `fromStadiumId`/`toStadiumId`
- [ ] **4.1**: Highlighted marker visually distinct (larger, gold ring)
- [ ] **5.1**: Timeline hover → `highlightStore` mutated → `isActive` passed to card
- [ ] **5.2**: Map marker hover → `highlightStore` mutated → timeline card activates
- [ ] **5.3**: Highlighted polyline segments are gold + thick
- [ ] **6.x**: All new/modified tests pass; `npm run test -- --run` green
- [ ] **Type-check**: `npm run type-check` zero errors
