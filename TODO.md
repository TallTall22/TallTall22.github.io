# F-11: 載入狀態管理 (Loading State Management) — BDD Task Breakdown

## Executive Summary

**What**: Three sub-features that give users clear visual feedback during async operations:
- **F-11.1 Timeline Skeleton** — Replace the `v-progress-linear` loading state in `TripTimelineStrip` with shimmer skeleton cards matching real card dimensions (220×160px)
- **F-11.2 Loading Stage Bar** — A slim bar below the app-bar that shows which pipeline stage (`filtering` | `routing`) is currently active, with a Chinese label and animated progress indicator
- **F-11.3 Map Error Retry** — Add an optional "重試" button to `MapErrorBanner` so users can re-trigger the routing pipeline without resetting the entire form

**Why**: The current loading UX gives no indication of *which* operation is running or how long it will take. Skeleton screens reduce perceived wait time; the stage bar prevents users from assuming the app is frozen; the retry button avoids a full page refresh on transient routing errors.

**Scope IN**: `TimelineSkeletonCard.vue`, `TimelineSkeletonStrip.vue`, `LoadingStageBar.vue`, `useLoadingStage.ts`, updates to `MapErrorBanner.vue`, `MapViewContainer.vue`, `TripTimelineStrip.vue`, `App.vue`, type additions in `models.ts` and `components.ts`, and test files for all new units.

**Scope OUT**: Server-side error recovery, retry with exponential backoff, skeleton for the map panel, skeleton for the control panel, toast/snackbar notifications, animated progress percentage.

---

## BDD Scenarios

### F-11.1 — Timeline Skeleton Cards

**Scenario 1.A — Skeleton replaces linear progress**
- **Given**: `useTimeline.isLoading` is `true`
- **When**: `TripTimelineStrip` renders
- **Then**: `TimelineSkeletonStrip` is displayed (8 shimmer cards in horizontal scroll); the old `v-progress-linear` is gone

**Scenario 1.B — Skeleton matches card dimensions**
- **Given**: A `TimelineSkeletonCard` is rendered in isolation
- **When**: dimensions are inspected
- **Then**: `width: 220px`, `min-height: 160px`; header block height 36px; three shimmer lines (80%, 60%, 40% width)

**Scenario 1.C — Shimmer animation runs**
- **Given**: A `TimelineSkeletonCard` is mounted
- **When**: CSS is applied
- **Then**: `@keyframes shimmer` animates `background-position` from `200% 0` to `-200% 0` over 1.5s infinitely

**Scenario 1.D — Accessibility**
- **Given**: `TimelineSkeletonStrip` is mounted
- **When**: screen reader inspects the element
- **Then**: `aria-busy="true"` and `aria-label="載入中..."` are present; individual cards have `aria-hidden="true"`

---

### F-11.2 — Loading Stage Bar

**Scenario 2.A — Bar hidden when idle**
- **Given**: Both `isFiltering` and `isRouting` are `false`
- **When**: `LoadingStageBar` renders with `stage="idle"`
- **Then**: `.loading-stage-bar` is not in the DOM

**Scenario 2.B — Bar shows filtering stage**
- **Given**: `isFiltering` is `true`, `isRouting` is `false`
- **When**: `useLoadingStage` computes stage
- **Then**: `stage.value === 'filtering'`; `LoadingStageBar` displays "正在篩選比賽資料..." with `v-progress-linear`

**Scenario 2.C — Bar shows routing stage**
- **Given**: `isFiltering` is `false`, `isRouting` is `true`
- **When**: `useLoadingStage` computes stage
- **Then**: `stage.value === 'routing'`; `LoadingStageBar` displays "正在計算最佳行程路線..."

**Scenario 2.D — Filtering priority**
- **Given**: Both `isFiltering` and `isRouting` are `true` (edge case during transition)
- **When**: `useLoadingStage` evaluates
- **Then**: `stage.value === 'filtering'` (filtering takes priority)

**Scenario 2.E — Smooth transition**
- **Given**: Stage changes from `filtering` to `idle`
- **When**: `Transition` component runs
- **Then**: `.slide-stage-leave-active` fades out with `max-height` collapse over 0.25s

**Scenario 2.F — Placement in layout**
- **Given**: `App.vue` renders
- **When**: the layout is painted
- **Then**: `LoadingStageBar` appears as the first child of `.main-layout`, between the app-bar and the two-column row

---

### F-11.3 — Map Error Retry

**Scenario 3.A — No retry button when onRetry is null**
- **Given**: `MapErrorBanner` receives `onRetry: null`
- **When**: rendered
- **Then**: no "重試" button is visible

**Scenario 3.B — Retry button appears when callback provided**
- **Given**: `MapErrorBanner` receives a valid `onRetry` callback
- **When**: rendered
- **Then**: a "重試" button is visible inside the alert

**Scenario 3.C — Retry callback fires on click**
- **Given**: `onRetry` is a spy function
- **When**: user clicks the "重試" button
- **Then**: `onRetry` is called exactly once

**Scenario 3.D — Banner resets after message change**
- **Given**: user dismissed the banner
- **When**: `props.message` changes to a new error message
- **Then**: `dismissed` ref resets to `false` and the banner reappears

**Scenario 3.E — App wires retry to store**
- **Given**: `App.vue` is rendered
- **When**: routing error is active
- **Then**: clicking "重試" calls `store.requestTripGeneration()` which re-triggers the pipeline

---

## Task Checklist

### Phase 1 — Type System

- [x] **1.1** Add `LoadingStage` type to `src/types/models.ts` ✅
- [x] **1.2** Add `LoadingStageBarProps` interface and `onRetry` to `MapViewProps` in `src/types/components.ts` ✅
- [x] **1.3** Verify `LoadingStage` and `LoadingStageBarProps` are re-exported via barrel ✅

### Phase 2 — Composable

- [x] **2.1** Create `src/composables/useLoadingStage.ts` ✅

### Phase 3 — New Components

- [x] **3.1** Create `src/components/timeline/TimelineSkeletonCard.vue` ✅
- [x] **3.2** Create `src/components/timeline/TimelineSkeletonStrip.vue` ✅
- [x] **3.3** Create `src/components/LoadingStageBar.vue` ✅
- [x] **3.4** Update `src/components/map/MapErrorBanner.vue` — add `onRetry` prop + retry button ✅

### Phase 4 — Integration

- [x] **4.1** Update `src/components/timeline/TripTimelineStrip.vue` — replace linear progress with `TimelineSkeletonStrip` ✅
- [x] **4.2** Update `src/components/map/MapViewContainer.vue` — fix import + thread `onRetry` to `MapErrorBanner` ✅
- [x] **4.3** Update `src/App.vue` — wire `useLoadingStage`, `LoadingStageBar`, and `onRetry` to `MapViewContainer` ✅

### Phase 5 — Tests

- [x] **5.1** Create `src/components/timeline/__tests__/TimelineSkeletonStrip.spec.ts` ✅
- [x] **5.2** Create `src/components/__tests__/LoadingStageBar.spec.ts` ✅
- [x] **5.3** Create `src/components/map/__tests__/MapErrorBanner.spec.ts` ✅
- [x] **5.4** Create `src/composables/__tests__/useLoadingStage.spec.ts` ✅

---

## File Change Summary

| File | Action | Status |
|------|--------|--------|
| `src/types/models.ts` | EDIT — add `LoadingStage` type | ✅ |
| `src/types/components.ts` | EDIT — add `LoadingStageBarProps`, update `MapViewProps` | ✅ |
| `src/composables/useLoadingStage.ts` | NEW | ✅ |
| `src/components/timeline/TimelineSkeletonCard.vue` | NEW | ✅ |
| `src/components/timeline/TimelineSkeletonStrip.vue` | NEW | ✅ |
| `src/components/LoadingStageBar.vue` | NEW | ✅ |
| `src/components/map/MapErrorBanner.vue` | EDIT — add `onRetry` | ✅ |
| `src/components/timeline/TripTimelineStrip.vue` | EDIT — skeleton swap | ✅ |
| `src/components/map/MapViewContainer.vue` | EDIT — fix import + `onRetry` | ✅ |
| `src/App.vue` | EDIT — wire stage bar + retry | ✅ |
| `src/composables/__tests__/useLoadingStage.spec.ts` | NEW | ✅ |
| `src/components/timeline/__tests__/TimelineSkeletonStrip.spec.ts` | NEW | ✅ |
| `src/components/__tests__/LoadingStageBar.spec.ts` | NEW | ✅ |
| `src/components/map/__tests__/MapErrorBanner.spec.ts` | NEW | ✅ |
| `TODO.md` | REWRITE — F-11 BDD content | ✅ |
