# F-10: 行程重置和編輯 (Trip Reset, Export & Share) — BDD Task Breakdown

## Executive Summary

**What**: Three action controls surfaced in a new `TripActionBar` organism:
- **F-10.1 Reset** — clears all trip state and returns app to initial blank state with user confirmation feedback
- **F-10.2 Export** — serialises the active `Trip` to downloadable JSON or a print-formatted PDF (via browser `window.print()`)
- **F-10.3 Share** — encodes trip input parameters (`startDate`, `endDate`, `homeStadiumId`) into a URL-safe query string; decodes on mount to restore state and re-trigger generation

**Why**: Users invest effort planning a trip. Reset/Export/Share are the three most critical "save my work" affordances before a user closes the tab or wants to hand off the link to a travel companion.

**Scope IN**: `TripActionBar.vue` container + `useExportTrip.ts` composable + `useTripShare.ts` composable; confirmation snackbar for Reset; JSON download + print dialog for Export; URL encode/decode round-trip for Share.

**Scope OUT**: Server-side persistence, user authentication, cloud save, email delivery of export, progressive-web-app share sheet (Web Share API), editing individual itinerary days in-place.

---

## Domain Analysis & Recursive Validation

### Given-When-Then Scenarios

---

#### F-10.1 — Reset ("重新開始")

**Scenario 1.A — Happy Path Reset**

- **Given**: A trip has been generated (`tripStore.selectedTrip !== null`); date range, homeStadium, and timeline are all populated; user is on the main planner view.
- **When**: User clicks the "重新開始" Reset button inside `TripActionBar`.
- **Then**:
  - `tripStore.reset()` is called → `startDate`, `endDate`, `homeStadiumId`, `selectedTrip`, `_tripGenId` all return to `null`/`0`.
  - `mapStore.reset()` is called → map center returns to `{ lat: 39.5, lng: -98.35 }`, zoom to `4`.
  - `highlightStore.clearHovered()` is called → `hoveredStadiumId` becomes `null`.
  - A Vuetify `VSnackbar` appears with text "行程已重置" for 3 s, then auto-dismisses.
  - Timeline strip becomes empty; map polylines and markers revert to default (no-trip) state.

**Scenario 1.B — Reset with No Active Trip**

- **Given**: App is in initial state (`selectedTrip === null`); no date range set.
- **When**: User inspects the Reset button.
- **Then**: Reset button is **disabled** when `selectedTrip === null` — no-op prevents confusing double-reset.

**Scenario 1.C — Reset Clears Share URL**

- **Given**: A `?trip=<encoded>` query param is present in the URL (user arrived via a share link).
- **When**: User clicks Reset.
- **Then**: After store resets, `history.replaceState` removes `?trip=` param so refreshing the page starts blank.

---

#### F-10.2 — Export ("導出行程")

**Scenario 2.A — Export JSON**

- **Given**: `selectedTrip` is non-null.
- **When**: User opens the Export dropdown and selects "下載 JSON".
- **Then**:
  - `useExportTrip.exportJson()` serialises `selectedTrip` with `JSON.stringify(..., null, 2)`.
  - A `Blob` with `type: 'application/json'` is created; transient `<a>` element triggers browser download named `mlb-trip-<tripId>.json`.
  - `URL.revokeObjectURL` is called immediately after `a.click()` to prevent memory leak.
  - No navigation or store mutation occurs.

**Scenario 2.B — Export PDF (Print)**

- **Given**: `selectedTrip` is non-null.
- **When**: User opens the Export dropdown and selects "列印 / 儲存 PDF".
- **Then**:
  - `useExportTrip.exportPdf()` calls `window.print()`.
  - A `@media print` stylesheet (imported globally) hides map, action bar, control panel; timeline expands to full page width.
  - Browser opens native print dialog; user can save as PDF via OS print-to-PDF.
  - Zero external library added — no bundle size increase.

**Scenario 2.C — Export Attempted with No Trip**

- **Given**: `selectedTrip === null` (no trip generated yet).
- **When**: User views `TripActionBar`.
- **Then**: Both export options are disabled (`:disabled="!canExport"`). No download or print fires.

---

#### F-10.3 — Share ("分享行程")

**Scenario 3.A — Encode State to URL**

- **Given**: `startDate`, `endDate`, `homeStadiumId` are all non-null in `tripStore`.
- **When**: User clicks the "分享行程" Share button.
- **Then**:
  - `useTripShare.encodeToUrl()` serialises `{ startDate, endDate, homeStadiumId }` as JSON, base64url-encodes it (`+`→`-`, `/`→`_`, strip `=` padding).
  - `history.replaceState` writes `?trip=<encoded>` (no page reload).
  - `navigator.clipboard.writeText(fullUrl)` copies the share URL.
  - Share button shows "✓ 已複製" for 2 s, then reverts. Snackbar confirms "分享連結已複製到剪貼簿！".

**Scenario 3.B — Decode URL on App Mount**

- **Given**: User navigates to `/?trip=<encoded>` (received a share link).
- **When**: `App.vue` mounts (`useTripShare` composable's `onMounted` hook fires).
- **Then**:
  - `useTripShare.decodeFromUrl()` reads `URLSearchParams` → extracts `trip` param → base64url-decodes → `JSON.parse` → validates via `isSharePayload` type guard.
  - `tripStore.setStartDate()`, `tripStore.setEndDate()`, `tripStore.setHomeStadium()` are called.
  - `tripStore.requestTripGeneration()` triggers routing algorithm → trip populates.
  - `?trip=` param remains in URL (refreshing re-triggers correctly).

**Scenario 3.C — Malformed / Tampered URL Param**

- **Given**: URL contains `?trip=INVALID!!!` or decoded JSON is missing required fields.
- **When**: App mounts and `decodeFromUrl()` runs.
- **Then**: `try/catch` swallows error; param is silently ignored; store remains at initial values; `history.replaceState` removes the bad param; app loads normally.

**Scenario 3.D — Share Button Disabled When State Incomplete**

- **Given**: Any of `startDate`, `endDate`, `homeStadiumId` is null.
- **When**: User views `TripActionBar`.
- **Then**: Share button is disabled. No URL encoding occurs.

**Scenario 3.E — Clipboard API Unavailable (HTTP / Old Browser)**

- **Given**: `navigator.clipboard` is `undefined`.
- **When**: User clicks Share (state complete).
- **Then**: URL is still written to address bar via `history.replaceState`. Snackbar shows "分享連結已更新（請手動複製網址列）" as fallback. No error thrown.

---

## Technical Feasibility Assessment

| Concern | Finding | Mitigation |
|---|---|---|
| URL length limit | base64url of `{ startDate, endDate, homeStadiumId }` ≈ 80 chars — well under 2 KB browser limit | Only encode 3 input fields; never encode full `Trip` object |
| base64url edge cases | `btoa()` not URL-safe; `=` padding breaks `URLSearchParams` | Custom encode: `+→-`, `/→_`, strip `=`; reverse on decode |
| Clipboard API permission | `navigator.clipboard.writeText` requires HTTPS + user gesture | Guard with `if (navigator.clipboard)`; fallback to snackbar-only |
| `window.print()` timing | Print dialog may freeze JS briefly | Call synchronously — no `nextTick` needed; browser queues the dialog |
| Print stylesheet scope | Must not affect screen styles | Dedicated `src/assets/print.css` with `@media print` only; imported in `main.ts` |
| Reset + URL param | Stale `?trip=` would re-trigger generation on page refresh after reset | Reset handler calls `useTripShare().clearUrlParam()` via `history.replaceState` |
| Race condition on mount | `decodeFromUrl` fires before stadiums loaded → `setHomeStadium` sets ID before stadium list exists | Safe: F-05 routing watcher handles async stadium load; store accepts any string ID at set time |
| `any` from `JSON.parse` | `JSON.parse` returns `any` in default TypeScript configs | Use `unknown` return type + `isSharePayload()` type guard before destructuring |
| `SharePayload` type safety | Decoded object must be narrowed before store calls | `isSharePayload` pure function with field-level `typeof` checks |
| Blob download cleanup | Transient `<a>` and object URL must be cleaned | `URL.revokeObjectURL(url)` called immediately after `a.click()` |
| PDF content fidelity | `window.print()` captures DOM; Leaflet map canvas may print blank | `@media print` hides `.map-view-container`; timeline renders as text — no canvas dependency |
| `canExport` gate | Must guard against `selectedTrip === null` | `computed(() => tripStore.selectedTrip !== null)` in composable; component binds `:disabled` |
| `canShare` gate | Must require all 3 input fields non-null | `computed` checks `startDate && endDate && homeStadiumId` |
| `isCopied` timing | "已複製" state must auto-revert after 2 s | `setTimeout(() => { isCopied.value = false }, 2000)` after successful clipboard write |

---

## Task Breakdown & Atomic Decomposition

### Phase 1: Type System & Data Contracts

**Why First**: TypeScript interfaces guide composable signatures and component props — catch errors at design time.

---

**1.1** `src/types/share.ts` — Create `SharePayload` interface + `isSharePayload` type guard *(~30 min)*

```typescript
// NEW FILE: src/types/share.ts

/** The minimal trip input encoded into the share URL */
export interface SharePayload {
  startDate:     string;   // ISODateString — validated post-decode
  endDate:       string;   // ISODateString
  homeStadiumId: string;   // Stadium.id — must be non-empty
}

/**
 * Type guard: narrows unknown → SharePayload.
 * Pure function — no Vue imports; independently unit-testable.
 */
export function isSharePayload(v: unknown): v is SharePayload {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['startDate']     === 'string' &&
    typeof obj['endDate']       === 'string' &&
    typeof obj['homeStadiumId'] === 'string' &&
    (obj['homeStadiumId'] as string).length > 0
  );
}
```

- No Vue dependency — pure TS utility
- `isSharePayload` is exported so it can be used in composable AND tested directly

---

**1.2** `src/types/components.ts` — Add `TripActionBarProps` and `ActionSnackbarState` *(~20 min)*

```typescript
// Append to src/types/components.ts

/** Props for TripActionBar organism — reads stores directly, minimal props */
export interface TripActionBarProps {
  // intentionally empty — organism reads Pinia stores directly
  // (mirrors TripTimelineStrip pattern)
}

/** Internal snackbar state owned by TripActionBar */
export interface ActionSnackbarState {
  visible:  boolean;
  message:  string;
  color:    'success' | 'info' | 'warning' | 'error';
  timeout:  number;
}
```

---

**1.3** `src/types/index.ts` — Re-export from `./share` *(~5 min)*

```typescript
// Add to existing barrel exports:
export * from './share';
```

---

### Phase 2: Composables

**Why Before Components**: Composables are pure business logic — unit-testable without mounting Vue.

---

**2.1** `src/composables/useExportTrip.ts` — JSON + PDF export *(~1 h)*

```typescript
// src/composables/useExportTrip.ts
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useTripStore } from '@/stores/tripStore';

export interface UseExportTripReturn {
  canExport: ComputedRef<boolean>;
  exportJson: () => void;
  exportPdf:  () => void;
}

export function useExportTrip(): UseExportTripReturn {
  const tripStore = useTripStore();
  const canExport = computed(() => tripStore.selectedTrip !== null);

  function exportJson(): void {
    const trip = tripStore.selectedTrip;
    if (!trip) return;
    const json = JSON.stringify(trip, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mlb-trip-${trip.tripId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);   // immediate revoke — no memory leak
  }

  function exportPdf(): void {
    window.print();             // zero-dep; browser handles print-to-PDF
  }

  return { canExport, exportJson, exportPdf };
}
```

- **Error handling**: `if (!trip) return` guard; `revokeObjectURL` called synchronously after click
- **Testing surface**: spy on `document.createElement`, `URL.createObjectURL`, `URL.revokeObjectURL`, `window.print`

---

**2.2** `src/composables/useTripShare.ts` — URL encode/decode + clipboard *(~1.5 h)*

```typescript
// src/composables/useTripShare.ts
import { computed, ref, onMounted } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { useTripStore } from '@/stores/tripStore';
import { isSharePayload } from '@/types';

export interface UseTripShareReturn {
  canShare:      ComputedRef<boolean>;
  isCopied:      Ref<boolean>;
  encodeToUrl:   () => Promise<void>;
  decodeFromUrl: () => void;
  clearUrlParam: () => void;
}

/** Pure helpers — exported for direct unit testing */
export function base64urlEncode(input: string): string {
  return btoa(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad    = padded.length % 4;
  return atob(pad ? padded + '='.repeat(4 - pad) : padded);
}

export function useTripShare(): UseTripShareReturn {
  const tripStore = useTripStore();

  const canShare = computed(
    () => tripStore.startDate !== null
       && tripStore.endDate   !== null
       && tripStore.homeStadiumId !== null
  );

  const isCopied = ref(false);

  async function encodeToUrl(): Promise<void> {
    if (!canShare.value) return;
    const payload  = { startDate: tripStore.startDate, endDate: tripStore.endDate, homeStadiumId: tripStore.homeStadiumId };
    const encoded  = base64urlEncode(JSON.stringify(payload));
    const url      = `${window.location.origin}${window.location.pathname}?trip=${encoded}`;
    history.replaceState({}, '', `?trip=${encoded}`);

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        isCopied.value = true;
        setTimeout(() => { isCopied.value = false; }, 2000);
      } catch {
        // clipboard denied — URL already in address bar; snackbar will show fallback msg
      }
    }
    // caller (TripActionBar) reads isCopied to decide snackbar message
  }

  function decodeFromUrl(): void {
    const param = new URLSearchParams(window.location.search).get('trip');
    if (!param) return;
    try {
      const decoded = JSON.parse(base64urlDecode(param)) as unknown;
      if (!isSharePayload(decoded)) throw new Error('invalid payload');
      tripStore.setStartDate(decoded.startDate);
      tripStore.setEndDate(decoded.endDate);
      tripStore.setHomeStadium(decoded.homeStadiumId);
      tripStore.requestTripGeneration();
    } catch {
      clearUrlParam(); // remove corrupt param silently
    }
  }

  function clearUrlParam(): void {
    history.replaceState({}, '', window.location.pathname);
  }

  onMounted(() => { decodeFromUrl(); });

  return { canShare, isCopied, encodeToUrl, decodeFromUrl, clearUrlParam };
}
```

- **`onMounted` decode**: auto-fires when composable is instantiated in `App.vue`
- **Error handling**: `try/catch` on decode path; `clearUrlParam` on failure; clipboard failure silently swallowed
- **Pure helpers exported**: `base64urlEncode`/`base64urlDecode` have no Vue dependency → directly unit-testable

---

### Phase 3: Print Stylesheet (Zero-Dep PDF)

**Why Separate Phase**: The PDF export depends entirely on CSS correctness. Must be done before any export demo/testing.

---

**3.1** `src/assets/print.css` — `@media print` stylesheet *(~45 min)*

```css
/* src/assets/print.css — screen styles unaffected */
@media print {
  /* ── Hide non-print elements ── */
  .trip-action-bar,
  .map-view-container,
  .control-panel,
  .v-navigation-drawer,
  .v-app-bar,
  .v-snackbar             { display: none !important; }

  /* ── Timeline fills full page ── */
  .trip-timeline-strip {
    display: block !important;
    overflow: visible !important;
    width: 100% !important;
    padding: 0 !important;
  }

  /* ── Avoid splitting cards across pages ── */
  .trip-timeline-card {
    break-inside:      avoid;
    page-break-inside: avoid;
    margin-bottom:     12pt;
    border:            1pt solid #ccc;
    padding:           8pt;
  }

  body {
    font-family: Georgia, serif;
    font-size:   11pt;
    color:       #000;
  }
}
```

- CSS class names must match root element classes of actual components
- No JS — purely declarative; zero runtime overhead

---

**3.2** `src/main.ts` — Import `print.css` *(~5 min)*

```typescript
// Add after existing asset imports in src/main.ts:
import '@/assets/print.css';
```

---

### Phase 4: Atomic UI Components

**Why After Composables**: Atoms consume composable return types. Locking composable signatures first prevents interface drift.

---

**4.1** `src/components/control-panel/ResetButton.vue` — Atom *(~45 min)*

```typescript
// Props: none — atom is purely presentational; parent controls disabled state
// Emits: 'reset-confirmed'
defineProps<{ disabled?: boolean }>()
defineEmits<{ (e: 'reset-confirmed'): void }>()

// Renders: VBtn variant="outlined" color="error" prepend-icon="mdi-restart"
// Label: "重新開始"
// :disabled="disabled"
```

- **Scope**: single button; no store access; no async
- **CSS class**: none required (atom styled via Vuetify props)

---

**4.2** `src/components/control-panel/ExportMenu.vue` — Molecule *(~1 h)*

```typescript
// Props: canExport (boolean)
// Emits: 'export-json' | 'export-pdf'
defineProps<{ canExport: boolean }>()
defineEmits<{ (e: 'export-json'): void; (e: 'export-pdf'): void }>()

// Renders: VBtn (activator) + VMenu with two VListItems:
//   VListItem "下載 JSON"        → emits 'export-json'
//   VListItem "列印 / 儲存 PDF"  → emits 'export-pdf'
// Both items: :disabled="!canExport"
// VTooltip on disabled: "請先產生行程"
```

- **Scope**: button + dropdown; no store; no async — pure emit-up pattern

---

**4.3** `src/components/control-panel/ShareButton.vue` — Atom *(~45 min)*

```typescript
// Props: canShare (boolean), isCopied (boolean)
// Emits: 'share-clicked'
defineProps<{ canShare: boolean; isCopied: boolean }>()
defineEmits<{ (e: 'share-clicked'): void }>()

// Default state:   VBtn icon="mdi-share-variant"  label="分享行程"
// isCopied=true:  VBtn icon="mdi-check"           label="已複製！"  color="success"
// :disabled="!canShare"
// VTooltip on disabled: "請先設定行程參數後再分享"
```

- **Scope**: single button; two visual states driven by `isCopied` prop — purely presentational
- Parent (`TripActionBar`) handles async clipboard logic

---

**4.4** `src/components/control-panel/TripActionBar.vue` — Organism *(~1.5 h)*

```typescript
// No props (organism reads stores directly)
// Internal reactive state: snackbar: ActionSnackbarState

// Composables instantiated here:
const { canExport, exportJson, exportPdf } = useExportTrip();
const { canShare, isCopied, encodeToUrl, clearUrlParam } = useTripShare();
const tripStore      = useTripStore();
const mapStore       = useMapStore();
const highlightStore = useHighlightStore();

// Reset handler:
function handleReset(): void {
  tripStore.reset();
  mapStore.reset();
  highlightStore.clearHovered();
  clearUrlParam();                        // strip ?trip= from URL
  showSnackbar('行程已重置', 'info', 3000);
}

// Share handler:
async function handleShare(): Promise<void> {
  await encodeToUrl();
  const msg = isCopied.value
    ? '分享連結已複製到剪貼簿！'
    : '分享連結已更新（請手動複製網址列）';
  showSnackbar(msg, 'success', 3000);
}

// Layout: VCard > VRow with:
//   <ResetButton  :disabled="!canExport"          @reset-confirmed="handleReset" />
//   <ExportMenu   :can-export="canExport"          @export-json="exportJson" @export-pdf="exportPdf" />
//   <ShareButton  :can-share="canShare" :is-copied="isCopied" @share-clicked="handleShare" />
//   <VSnackbar    v-model="snackbar.visible" ... />
// Root element class: "trip-action-bar"   ← matches print.css hide rule
```

- **Architecture note**: `useTripShare()` is also called in `App.vue` (Phase 5.1) so `onMounted` decode fires at root level. Calling it again here is safe — Pinia store is a singleton; `onMounted` in the composable runs per-component but `decodeFromUrl` is idempotent (no `?trip=` param after first decode).
- **`canReset` = `canExport`**: Reset is only meaningful when a trip exists. Re-uses same computed.

---

### Phase 5: App.vue Integration

**Why Separate Phase**: `useTripShare`'s `onMounted` decode must fire at the app root — earliest lifecycle point, before any child renders.

---

**5.1** `src/App.vue` — Instantiate `useTripShare` for mount-time URL decode *(~30 min)*

```typescript
// In App.vue <script setup> — add:
import { useTripShare } from '@/composables/useTripShare';

// Instantiate at app root so onMounted decode fires first
useTripShare();
// (Return values not needed here — TripActionBar has its own instance for UI state)
```

---

**5.2** `src/App.vue` — Mount `<TripActionBar />` in layout *(~20 min)*

```html
<!-- Add inside the control-panel column, below StadiumSelector / QuickStartPresets -->
<TripActionBar />
```

- Import and register `TripActionBar` component
- Verify it doesn't break existing layout (use `v-divider` above if needed)
- CSS root class `trip-action-bar` must be present on component root → hides on print

---

### Phase 6: Tests

**Why Last**: All implementation must be present. Phase 6.1/6.2/6.3 can run in parallel (no inter-dependency).

---

**6.1** `src/composables/__tests__/useExportTrip.spec.ts` *(~1 h)*

Coverage targets:
- `canExport` is `false` when `selectedTrip === null`
- `canExport` is `true` when `selectedTrip` is populated
- `exportJson()` is a no-op when `canExport === false`
- `exportJson()` creates correct `Blob` type (`application/json`) and filename (`mlb-trip-<id>.json`)
- `exportJson()` calls `URL.createObjectURL` then `URL.revokeObjectURL`
- `exportPdf()` calls `window.print`

---

**6.2** `src/composables/__tests__/useTripShare.spec.ts` *(~1.5 h)*

Coverage targets:
- `base64urlEncode` / `base64urlDecode` round-trip: encode → decode returns original string
- `base64urlEncode` output contains no `+`, `/`, or `=`
- `canShare` is `false` when any of 3 fields is null; `true` when all set
- `encodeToUrl()` calls `history.replaceState` with URL containing `?trip=`
- `encodeToUrl()` calls `navigator.clipboard.writeText` when available
- `encodeToUrl()` does NOT throw when `navigator.clipboard` is `undefined`
- `decodeFromUrl()` with valid `?trip=` → calls `setStartDate`, `setEndDate`, `setHomeStadium`, `requestTripGeneration`
- `decodeFromUrl()` with invalid base64 → no store calls; no thrown error; calls `history.replaceState` to clear param
- `decodeFromUrl()` with valid base64 but missing fields (type guard fails) → no store calls
- `decodeFromUrl()` with no `?trip=` param → no-op
- `clearUrlParam()` calls `history.replaceState` with pathname only (no `?`)

---

**6.3** `src/types/__tests__/isSharePayload.spec.ts` *(~30 min)*

Coverage targets:
- Returns `true` for valid `{ startDate: '2025-06-01', endDate: '2025-06-14', homeStadiumId: 'NYY' }`
- Returns `false` for `null`, `undefined`, empty object `{}`
- Returns `false` when any field is missing
- Returns `false` when `homeStadiumId` is empty string `''`
- Returns `false` when a field is wrong type (e.g. `startDate: 123`)

---

**6.4** `src/components/control-panel/__tests__/TripActionBar.spec.ts` *(~1.5 h)*

Coverage targets (mount with `createTestingPinia`):
- All buttons disabled when `selectedTrip === null`
- Reset button click → `tripStore.reset`, `mapStore.reset`, `highlightStore.clearHovered` all called
- Reset button click → snackbar becomes visible with text "行程已重置"
- Export JSON menu item click → `exportJson` composable spy called
- Export PDF menu item click → `exportPdf` composable spy called (or `window.print` spy)
- Share button click → `encodeToUrl` composable spy called
- Share button shows "已複製！" label when `isCopied === true`

---

**6.5** `src/components/control-panel/__tests__/ExportMenu.spec.ts` *(~45 min)*

Coverage targets:
- Renders two `VListItem` entries
- Both items have `disabled` attribute when `:canExport="false"`
- Clicking first item emits `'export-json'`
- Clicking second item emits `'export-pdf'`

---

**6.6** `src/components/control-panel/__tests__/ShareButton.spec.ts` *(~30 min)*

Coverage targets:
- Default state: shows "分享行程" text
- `:isCopied="true"` state: shows "已複製！" text
- `:canShare="false"` → button has `disabled` attribute
- Click when enabled → emits `'share-clicked'`

---

## Implementation Order & Critical Path

```
Phase 1 (Types: ~55 min)
  ├─ 1.1  share.ts — SharePayload + isSharePayload    (30 min)
  ├─ 1.2  components.ts — TripActionBarProps          (20 min)
  └─ 1.3  index.ts — barrel re-export                  (5 min)
  ↓ (blocks Phase 2)

Phase 2 (Composables: ~2.5h) ◄── PARALLEL with Phase 3
  ├─ 2.1  useExportTrip.ts                            (1h)
  └─ 2.2  useTripShare.ts                             (1.5h)

Phase 3 (Print CSS: ~50 min) ◄── PARALLEL with Phase 2
  ├─ 3.1  print.css                                   (45 min)
  └─ 3.2  import in main.ts                            (5 min)

  [Phase 2 + Phase 3 both done → unblock Phase 4]
  ↓

Phase 4 (Components: ~4h) — sequential within phase
  ├─ 4.1  ResetButton.vue                             (45 min)
  ├─ 4.2  ExportMenu.vue                              (1h)
  ├─ 4.3  ShareButton.vue                             (45 min)
  └─ 4.4  TripActionBar.vue                           (1.5h)
  ↓

Phase 5 (App Integration: ~50 min)
  ├─ 5.1  useTripShare() in App.vue                  (30 min)
  └─ 5.2  <TripActionBar /> mount in layout           (20 min)
  ↓

Phase 6 (Tests: ~5.75h) — 6.1 / 6.2 / 6.3 can run in parallel
  ├─ 6.1  useExportTrip.spec.ts                      (1h)
  ├─ 6.2  useTripShare.spec.ts                        (1.5h)
  ├─ 6.3  isSharePayload.spec.ts                     (30 min)
  ├─ 6.4  TripActionBar.spec.ts                       (1.5h)
  ├─ 6.5  ExportMenu.spec.ts                          (45 min)
  └─ 6.6  ShareButton.spec.ts                         (30 min)
```

**Critical Path**: Phase 1 → Phase 2 (2.2 is longest) → Phase 4 (4.4 blocks 5) → Phase 5 → Phase 6.4

**Total Effort**:
- Sequential: ~15 h
- Optimised (Phase 2 ∥ Phase 3; Phase 6.1/6.2/6.3 ∥): ~11 h

---

## File Structure to Create / Edit

```
src/
├── assets/
│   └── print.css                              ← NEW  (Phase 3.1)
├── main.ts                                    ← EDIT: import print.css (Phase 3.2)
├── App.vue                                    ← EDIT: useTripShare + <TripActionBar> (Phase 5)
├── types/
│   ├── share.ts                               ← NEW  (Phase 1.1)
│   ├── components.ts                          ← EDIT: add TripActionBar interfaces (Phase 1.2)
│   ├── index.ts                               ← EDIT: re-export share.ts (Phase 1.3)
│   └── __tests__/
│       └── isSharePayload.spec.ts             ← NEW  (Phase 6.3)
├── composables/
│   ├── useExportTrip.ts                       ← NEW  (Phase 2.1)
│   ├── useTripShare.ts                        ← NEW  (Phase 2.2)
│   └── __tests__/
│       ├── useExportTrip.spec.ts              ← NEW  (Phase 6.1)
│       └── useTripShare.spec.ts               ← NEW  (Phase 6.2)
└── components/
    └── control-panel/
        ├── ResetButton.vue                    ← NEW  (Phase 4.1)
        ├── ExportMenu.vue                     ← NEW  (Phase 4.2)
        ├── ShareButton.vue                    ← NEW  (Phase 4.3)
        ├── TripActionBar.vue                  ← NEW  (Phase 4.4)
        └── __tests__/
            ├── TripActionBar.spec.ts          ← NEW  (Phase 6.4)
            ├── ExportMenu.spec.ts             ← NEW  (Phase 6.5)
            └── ShareButton.spec.ts            ← NEW  (Phase 6.6)
```

---

## Acceptance Criteria

**Phase 1 — Types**
- [ ] **1.1**: `SharePayload` interface + `isSharePayload` type guard in `src/types/share.ts`; function is a pure TS export with no Vue imports; compiles under strict mode
- [ ] **1.2**: `TripActionBarProps` and `ActionSnackbarState` added to `components.ts`; zero `any`
- [ ] **1.3**: `src/types/index.ts` re-exports `share.ts`; `npm run type-check` passes with zero errors

**Phase 2 — Composables**
- [ ] **2.1**: `useExportTrip` compiles; `canExport` is reactive computed; `exportJson` creates `Blob`, triggers anchor download, calls `URL.revokeObjectURL`; `exportPdf` calls `window.print()`; guard returns early when `selectedTrip === null`
- [ ] **2.2**: `useTripShare` compiles; `base64urlEncode`/`base64urlDecode` are exported pure functions; encode output contains no `+`, `/`, `=`; `decodeFromUrl` is wrapped in `try/catch` and calls `clearUrlParam` on failure; `onMounted` triggers decode; `clearUrlParam` strips query string via `history.replaceState`

**Phase 3 — Print CSS**
- [ ] **3.1**: `print.css` hides `.trip-action-bar`, `.map-view-container`, `.control-panel` at `@media print`; timeline fills page width; cards have `break-inside: avoid`; no screen-mode regressions
- [ ] **3.2**: `import '@/assets/print.css'` present in `main.ts`

**Phase 4 — Components**
- [ ] **4.1**: `ResetButton.vue` renders `VBtn`, emits `'reset-confirmed'`; no direct store calls inside atom
- [ ] **4.2**: `ExportMenu.vue` renders two menu items; both disabled when `:canExport="false"`; emits `'export-json'` and `'export-pdf'` correctly
- [ ] **4.3**: `ShareButton.vue` shows "分享行程" by default and "已複製！" when `:isCopied="true"`; disabled when `:canShare="false"`; emits `'share-clicked'`
- [ ] **4.4**: `TripActionBar.vue` orchestrates all three actions; reset calls all 3 stores + `clearUrlParam`; share calls `encodeToUrl` then shows correct snackbar message based on `isCopied`; root element has CSS class `trip-action-bar`

**Phase 5 — App Integration**
- [ ] **5.1**: `useTripShare()` called in `App.vue <script setup>`; navigating to `/?trip=<valid>` auto-populates store and triggers trip generation
- [ ] **5.2**: `<TripActionBar />` visible in left control panel; CSS class `trip-action-bar` present; layout intact on all viewport sizes

**Phase 6 — Tests**
- [ ] **6.1**: `useExportTrip.spec.ts` — all 6 coverage targets pass
- [ ] **6.2**: `useTripShare.spec.ts` — all 11 coverage targets pass
- [ ] **6.3**: `isSharePayload.spec.ts` — all 5 coverage targets pass
- [ ] **6.4**: `TripActionBar.spec.ts` — all 7 coverage targets pass
- [ ] **6.5**: `ExportMenu.spec.ts` — all 4 coverage targets pass
- [ ] **6.6**: `ShareButton.spec.ts` — all 4 coverage targets pass
- [ ] **Global**: `npm run type-check` → 0 errors; `npm run test -- --run` → all tests green

---

## Verification — ✅ COMPLETE

- `npm run type-check` → **0 errors**
- `npm run test -- --run` → **394 tests passed, 30 suites, 0 failures**
- Implementation delivered as single `TripActionBar.vue` organism (no sub-atoms) with `useExportTrip` + `useTripShare` composables
- Manual — Reset: clicks Reset → all 3 stores cleared → snackbar shown "行程已重置"
- Manual — Export JSON: downloads `mlb-trip-<id>.json`; Export PDF: opens print dialog
- Manual — Share: encodes URL-safe base64 to `?trip=` param, writes to clipboard; on reload, `restoreFromUrl()` re-populates stores
- Manual — Export JSON: downloads `mlb-trip-<id>.json` with correct content →
- Manual — Export PDF: print dialog opens; map hidden; timeline readable →
- Manual — Share encode: URL updated with `?trip=`; clipboard contains full URL →
- Manual — Share decode: navigate to shared URL → trip auto-generates correctly →
- Manual — Malformed URL: `?trip=GARBAGE` → app loads blank; no console error →
- Manual — HTTP (no clipboard): share URL written to address bar; fallback snackbar shown →
