# F-06: 動態地圖連線 (Map Polylines) — BDD Decomposition & Atomic Task Board

> **BDD Requirements Expert Output** — Recursive Reasoning Loop Applied  
> Feature: F-06 | Priority: 🟡 MEDIUM | Depends On: F-05 ✅

---

## Executive Summary

**What**: Render an interactive map (Leaflet + OpenStreetMap) that draws colored polylines
connecting consecutive MLB stadium stops in the generated trip itinerary. Game-day segments are
solid blue; travel-day segments are dashed orange. Direction arrows mark each segment midpoint.
Map auto-fits bounds to display the entire route.

**Why**: The map is the primary visual output of the planner. Without it, the routing algorithm
output (F-05) is invisible to the user. This is the core "wow moment" of the portfolio project.

**Scope IN**:
- Leaflet map initialization (tile layer = OpenStreetMap, no API key needed)
- Polyline rendering for all consecutive itinerary stop pairs
- Color coding: game-day segment (solid blue #002D72, 3px) vs travel-day segment (dashed #FF6B35, 2px)
- Directional arrows at segment midpoints via `leaflet-arrowheads`
- Auto-fit map bounds to encompass all route stops
- Loading skeleton while trip is being computed
- Error state if map initialization fails

**Scope OUT**:
- Interactive markers / InfoWindows (F-07)
- Timeline component (F-08)
- Cross-highlight interaction (F-09)
- Google Maps API (using Leaflet — free, no API key, OSS)

---

## Domain Analysis & Recursive Validation

### Given-When-Then Scenarios

**Scenario 1: Happy Path — Trip Generated, Polylines Rendered**

- Given: `tripStore.selectedTrip` is a valid `Trip` with ≥ 2 itinerary days, each `GameDay`
  has a known `stadiumId` that resolves to a `Stadium` with lat/lng coordinates
- When: The `MapView` component mounts and `selectedTrip` becomes non-null (reactive watcher fires)
- Then:
  - Leaflet map renders with OSM tile layer
  - One polyline segment per consecutive stop pair appears on the map
  - Game-day segments are solid blue (#002D72, weight 3)
  - Travel-day segments are dashed orange (#FF6B35, weight 2)
  - Each segment has a directional arrowhead at its midpoint
  - Map `fitBounds()` is called with the bounding box of all stops
  - No error or loading state is shown

**Scenario 2: Trip Recomputed — Map Updates Reactively**

- Given: A trip is already displayed on the map
- When: User changes dates/stadium and a new trip is generated (store.selectedTrip updates)
- Then:
  - Previous polylines are cleared from the map layer
  - New polylines are drawn for the new itinerary
  - Map re-fits bounds to the new route
  - No stale segments remain

**Scenario 3: No Trip Yet — Empty / Loading State**

- Given: App just loaded and no trip has been computed yet (`selectedTrip === null`)
- When: `MapView` mounts
- Then:
  - Map renders centered on continental USA (lat: 39.5, lng: -98.35, zoom: 4)
  - No polylines are drawn
  - A subtle "Generate a trip to see your route" overlay is shown

**Scenario 4: Trip Computation In Progress — Loading State**

- Given: User clicked "Generate" and `isRouting === true`
- When: `MapView` receives `isLoading` prop as `true`
- Then:
  - A loading overlay (pulsing skeleton or spinner) covers the map
  - The overlay is removed as soon as `isLoading` becomes `false`

**Scenario 5: Routing Error — Error State on Map**

- Given: Routing algorithm returns an error (`routingError !== null`, `selectedTrip === null`)
- When: `MapView` receives `hasError` prop as `true`
- Then:
  - Map remains visible in default USA-center view
  - A non-blocking error banner appears at top of map area
  - User can still interact with the control panel to retry

**Scenario 6: TravelDay with Missing Stadium — Graceful Skip**

- Given: An itinerary contains a `TravelDay` where `stadiumId` is `undefined`
- When: `useMapPolylines` processes the itinerary
- Then:
  - That day is skipped when building segments (cannot draw a line to/from unknown location)
  - Adjacent valid segments continue to render correctly
  - No runtime error or broken polyline

### Technical Feasibility Assessment

| Concern           | Finding                                                      | Mitigation                                                      |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Race Condition    | selectedTrip watcher + async stadium lookup could interleave | Capture requestId per watch invocation; check before committing  |
| Prop Drilling     | isRouting lives in App.vue; map needs it                     | Pass as prop to MapView (single level); no drilling risk        |
| Type Safety       | `TravelDay.stadiumId` is optional; safe null checks needed   | Explicit type guards in useMapPolylines before coordinate access |
| Performance       | fitBounds() on every trip update; large itineraries          | Debounce or only call when polylines array changes              |
| Error Handling    | Leaflet CDN tile failure, map container not found            | onError handler on tile layer; null-check map ref               |
| Leaflet + SSR     | N/A — this is a Vite SPA (no SSR)                           | —                                                               |
| Arrowheads plugin | leaflet-arrowheads has no Vue bindings                       | Import vanilla plugin after Leaflet init; types via @types or   |
|                   |                                                              | manual declare module if needed                                 |
| State Persistence | Map zoom/center should NOT persist (trip-relative state)     | Keep ephemeral in mapStore; no localStorage needed              |
| Component cleanup | Leaflet map instance must be destroyed on unmount            | `map.remove()` in `onBeforeUnmount`                             |

---

## Atomic Task Board

### Phase 1: Type System & Data Contracts (Foundation) 🔴 CRITICAL

> **Why First**: TypeScript interfaces guide component design and catch errors at design time.

#### 1.1 — Define MapPolyline & MapBounds domain types (1h)
- **File**: `src/types/map.ts` (new file)
- **TypeScript Surface**:
  ```ts
  export type SegmentType = 'game_day' | 'travel_day';

  export interface MapCoordinate {
    lat: number;
    lng: number;
  }

  export interface MapPolylineSegment {
    id:        string;           // `${fromStadiumId}-${toStadiumId}-${dayIndex}`
    from:      MapCoordinate;
    to:        MapCoordinate;
    segmentType: SegmentType;
    dayIndex:  number;
  }

  export interface MapBounds {
    north: number;
    south: number;
    east:  number;
    west:  number;
  }

  export interface MapViewState {
    center:    MapCoordinate;
    zoom:      number;
    bounds:    MapBounds | null;
    isReady:   boolean;
    hasError:  boolean;
    errorMsg:  string | null;
  }
  ```
- **Error Handling**: N/A (pure types)
- **Testing Surface**: Type-only; verified via `vue-tsc --noEmit`
- **Status**: ⬜ pending

#### 1.2 — Define MapView component prop/emit interfaces (30min)
- **File**: `src/types/components.ts` (append)
- **TypeScript Surface**:
  ```ts
  export interface MapViewProps {
    isLoading?: boolean;
    hasError?:  boolean;
    errorMsg?:  string | null;
  }

  export interface MapPolylineLayerProps {
    segments: MapPolylineSegment[];
  }
  ```
- **Status**: ⬜ pending

#### 1.3 — Export new types from `src/types/index.ts` (15min)
- **File**: `src/types/index.ts`
- **Action**: Add `export * from './map';`
- **Status**: ⬜ pending

---

### Phase 2: Dependency Installation (Pre-Composable) 🔴 CRITICAL

#### 2.1 — Install Leaflet + Vue-Leaflet + Arrowheads (30min)
- **Status**: ✅ done

#### 2.2 — Add Leaflet CSS import to `main.ts` (15min)
- **Status**: ✅ done

---

### Phase 3: Composable & State Logic Layer ⚡ HIGH

> **Why Before Components**: Composables are unit-testable in isolation; components consume them.

#### 3.1 — Create `mapStore.ts` Pinia store (1h)
- **Status**: ✅ done — `src/stores/mapStore.ts`

#### 3.2 — Create `useMapPolylines.ts` composable (1.5h)
- **Status**: ✅ done — `src/composables/useMapPolylines.ts`

#### 3.3 — Create `useMapBounds.ts` composable (1h)
- **Status**: ✅ done — `src/composables/useMapBounds.ts`

#### 3.4 — Unit tests for `useMapPolylines` (1.5h)
- **Status**: ⬜ pending

#### 3.5 — Unit tests for `useMapBounds` (30min)
- **Status**: ⬜ pending

---

### Phase 4: Atomic Component Architecture ⚡ HIGH

> **Follows**: Phase 1 (types) + Phase 3 (composables).

#### 4.1 — `MapLoadingOverlay.vue` atom (30min)
- **Status**: ✅ done — `src/components/map/MapLoadingOverlay.vue`

#### 4.2 — `MapErrorBanner.vue` atom (30min)
- **Status**: ✅ done — `src/components/map/MapErrorBanner.vue`

#### 4.3 — `MapPolylineLayer.vue` molecule (1.5h)
- **Status**: ✅ done — `src/components/map/MapPolylineLayer.vue`

#### 4.4 — `MapBoundsManager.vue` headless component (45min)
- **Status**: ✅ done — `src/components/map/MapBoundsManager.vue`

#### 4.5 — `MapViewContainer.vue` organism (2h)
- **Status**: ✅ done — `src/components/map/MapViewContainer.vue`

---

### Phase 5: App Integration ⚡ HIGH

#### 5.1 — Update `App.vue` with split layout (1h)
- **Status**: ✅ done

---

### Phase 6: Error Hardening & Edge Cases ⚠️

#### 6.1 — Stale segments cleanup on unmount (30min)
- **File**: `src/composables/useMapPolylines.ts` (already handled in 3.2 if done right)
- **Verify**: `onBeforeUnmount` stops any in-flight async work; watcher is auto-stopped
- **Status**: ⬜ pending

#### 6.2 — Handle single-stop trip (only 1 itinerary day) (30min)
- **File**: `src/composables/useMapPolylines.ts`
- **Behavior**: `segments = []` (need ≥ 2 stops for a line); map shows single marker only (F-07)
- **Status**: ⬜ pending

---

### Phase 7: Integration Testing 🧪

#### 7.1 — `useMapPolylines` composable unit tests (already 3.4 above)
- **Status**: ⬜ pending (covered by 3.4)

#### 7.2 — `MapPolylineLayer` component integration test (1h)
- **File**: `src/components/map/__tests__/MapPolylineLayer.spec.ts` (new)
- **Coverage**:
  - Renders correct number of polylines
  - Game day segment gets correct color
  - Travel day segment gets dashed style
  - Clears layer on segment update
- **Status**: ⬜ pending

---

## Implementation Order & Critical Path

```
Phase 1 (Types: 1.75h)          ← blocks everything
  ↓
Phase 2 (Install deps: 45min)   ← parallel with Phase 1 OK
  ↓
Phase 3 (Composables: 4.5h)     ← blocks Phase 4
  ↓
Phase 4 (Components: 5.25h)     ← can parallel 4.1-4.4 after Phase 3 done
  ↓
Phase 5 (App integration: 1h)   ← blocks visible result
  ↓
Phase 6 (Edge cases: 1h)        ← parallel with Phase 7
Phase 7 (Tests: 1h)
```

**Parallel opportunities**: 4.1 + 4.2 can be developed in parallel with 4.3 + 4.4 + 4.5

---

## Acceptance Criteria

- [ ] Phase 1: All types compile; zero `any`; `vue-tsc --noEmit` passes
- [ ] Phase 2: `leaflet`, `@vue-leaflet/vue-leaflet`, `leaflet-arrowheads` in `package.json`
- [ ] Phase 3: `useMapPolylines` returns correct `MapPolylineSegment[]` for sample trip; unit tests green
- [ ] Phase 4: Map renders on screen; polylines visible; color coding correct; arrows visible
- [ ] Phase 5: App shows split panel; map + control panel side by side on md+ screens
- [ ] Phase 6: No console errors on single-stop trip, TravelDay-only itinerary, or rapid trip refresh
- [ ] Phase 7: All tests green; `npm run type-check` passes; `npm run build` succeeds

---

## Tech Stack for F-06

| Library                   | Version   | Purpose                          |
| ------------------------- | --------- | -------------------------------- |
| `leaflet`                 | ^1.9.x    | Core map engine                  |
| `@vue-leaflet/vue-leaflet`| ^0.10.x   | Vue 3 component wrappers         |
| `leaflet-arrowheads`      | ^1.4.x    | Directional arrows on polylines  |
| `@types/leaflet`          | ^1.9.x    | TypeScript declarations          |

---

## Anti-Patterns to Avoid

🚫 Do NOT use `any` for Leaflet instance — type as `L.Map | null`  
🚫 Do NOT call `map.fitBounds()` without null-checking the map instance first  
🚫 Do NOT forget `map.remove()` in `onBeforeUnmount` — memory leak risk  
🚫 Do NOT import Leaflet at module level in SSR-compatible code (N/A here but good habit)  
🚫 Do NOT mutate polyline layer directly; always clear + redraw via LayerGroup  
🚫 Do NOT allow `TravelDay` with no `stadiumId` to crash segment builder — always skip gracefully  
