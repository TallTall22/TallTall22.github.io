# TODO: F-01 — Date Range Selection (日期區間選擇)

> **Project**: MLB Ballpark Tour Planner (Pure SPA)
> **Stack**: Vue 3 + TypeScript (strict) + Vuetify 3 + Pinia + Vite
> **Priority**: 🔴 HIGH — No upstream dependencies, foundational to all other features
> **Legend**: ⬜ Pending · ✅ Done · 🔴 Blocked · ⚠️ Risk

---

## 🚀 NEXT STEP (Required before dev server works)

**Config files updated. Run in your terminal:**

```bash
cd C:\Users\fagy5\OneDrive\Desktop\mlb_field
node setup.js
```

This will: create all `src/` directories + **Phase 1-3 source files** → `npm install` → `npm run type-check`

**What's already done** (files updated but packages not yet installed):
- ✅ `package.json` — Vuetify 3, Pinia, MDI font, Vitest added
- ✅ `vite.config.ts` — `@/` alias + Vitest jsdom config
- ✅ `tsconfig.json` — strict mode, `@/*` path alias
- ✅ `src/main.ts` — MLB theme colors, Pinia wired
- ✅ `src/App.vue` — wired to `<DateRangePicker>` (smoke test ready)

**After `node setup.js` completes, also run:**
```bash
npm test        # run unit tests (Phase 2.3)
npm run dev     # verify dev server + Vuetify UI renders
```

---

## 🔍 Executive Summary

| Item       | Detail                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| **What**   | Let users pick a start date + end date for their MLB stadium tour             |
| **Why**    | Every downstream feature (route planning, stadium scheduling) depends on this |
| **In Scope**  | Start/End date pickers, 180-day max cap, no-past-date guard, Pinia store sync |
| **Out of Scope** | Stadium selection (F-02), Quick-start buttons (F-03), map integration   |

---

## 🧪 BDD Scenarios (Given-When-Then)

### Scenario 1 — Happy Path: Valid Date Range

```
Given:  DateRangePicker is mounted
        tripStore.startDate = null, tripStore.endDate = null
        Today = T (e.g., 2025-07-01)
When:   User selects startDate = T
        User selects endDate = T + 30 days (2025-07-31)
Then:   tripStore.startDate === "2025-07-01"
        tripStore.endDate   === "2025-07-31"
        ValidationResult = { valid: true, error: null, dayCount: 30 }
        DateRangePicker renders both values without error state
        DateRangeValidationFeedback is hidden
```

### Scenario 2 — Validation: Past Date Blocked

```
Given:  DateRangePicker is mounted
        Today = 2025-07-01
When:   User attempts to select startDate = 2025-06-28 (past)
Then:   v-date-picker disables all dates < today (min prop enforced)
        No store update occurs
        Error UI branch: "Cannot select a past date" (if user somehow bypasses min)
```

### Scenario 3 — Validation: endDate Before startDate

```
Given:  tripStore.startDate = "2025-08-01"
        endDate picker is open
When:   User selects endDate = "2025-07-20" (before startDate)
Then:   ValidationResult = { valid: false, error: 'END_BEFORE_START', dayCount: 0 }
        tripStore.endDate is NOT updated
        DateRangeValidationFeedback shows "結束日期必須晚於開始日期"
        endDate input enters v-text-field error state
```

### Scenario 4 — Validation: Range Exceeds 180 Days

```
Given:  tripStore.startDate = "2025-07-01"
When:   User selects endDate = "2026-01-10" (193 days — exceeds 180)
Then:   ValidationResult = { valid: false, error: 'EXCEEDS_MAX_DAYS', dayCount: 193 }
        tripStore.endDate is NOT updated
        DateRangeValidationFeedback shows "旅程不可超過 180 天 (目前: 193 天)"
        endDate input enters v-text-field error state
```

### Scenario 5 — Edge Case: Single-Day Trip

```
Given:  tripStore.startDate = "2025-09-15"
When:   User selects endDate = "2025-09-15" (same day)
Then:   ValidationResult = { valid: true, error: null, dayCount: 0 }
        tripStore.endDate === "2025-09-15"
        No error shown (0-day range is valid — day visit)
```

### Scenario 6 — Clear / Reset Dates

```
Given:  tripStore.startDate = "2025-08-01", tripStore.endDate = "2025-08-15"
When:   User clicks "清除日期" (clear button) inside DateRangePicker
Then:   tripStore.startDate = null, tripStore.endDate = null
        Both picker fields show placeholder text
        ValidationResult resets to { valid: false, error: null, dayCount: 0 }
```

### Scenario 7 — startDate Changed After endDate Set (Re-validation)

```
Given:  startDate = "2025-08-01", endDate = "2025-08-20" (valid range, 19 days)
When:   User changes startDate to "2025-08-18" (endDate becomes only 2 days ahead — still valid)
        OR User changes startDate to "2025-08-25" (now endDate is BEFORE startDate)
Then:   [Case A] ValidationResult re-computed: valid=true, dayCount=2
        [Case B] ValidationResult: { valid: false, error: 'END_BEFORE_START' }
                 tripStore.endDate automatically cleared to null
                 DateRangeValidationFeedback appears with error message
```

---

## ⚙️ Technical Feasibility Assessment

| Concern              | Finding                                                                   | Mitigation                                                                            |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Race Condition**   | User rapidly changes startDate while endDate watcher fires simultaneously | Use `watch` with `{ flush: 'sync' }` for sequential updates; no debounce needed (sync validation) |
| **Prop Drilling**    | `DateRangePicker → Start/End sub-components` = 2 levels (safe)            | Props + Emits pattern sufficient; Pinia store as single source of truth               |
| **Type Safety**      | `string \| null` dates need explicit guards before Date operations         | Define `type ISODateString = string & { readonly brand: 'ISODate' }` or use plain `string \| null` with type guards |
| **Performance**      | All validation is synchronous/in-memory                                   | No memoization needed; `computed()` naturally caches                                  |
| **Error Handling**   | All errors are synchronous — no async, no network                         | Pure computed `ValidationResult`; never throws, always returns error shape            |
| **State Persistence**| Dates should survive page refresh (nice-to-have)                          | Optional: `pinia-plugin-persistedstate` with localStorage; mark as Phase 5 enhancement |
| **Vuetify Versions** | Vuetify 3 date picker API differs from v2; uses `v-date-picker` + `v-menu` or `v-date-input` (v3.4+) | Pin to specific Vuetify 3 minor; use `v-date-picker` wrapped in `v-menu` for max compatibility |
| **Hydration**        | Pure SPA — no SSR                                                         | No hydration concerns                                                                 |
| **⚠️ CRITICAL**     | **Vuetify & Pinia are NOT in `package.json`** (used in code but missing from deps!) | Install both BEFORE any component work (see Phase 0)                              |

---

## 🏗️ Atomic Task Breakdown

---

### ⚡ Phase 0: Prerequisites (Config ✅ — Run `node setup.js` to complete)

> `package.json`, `main.ts`, `vite.config.ts`, `tsconfig.json` updated. Run `node setup.js` to install packages + create `src/types/`.

- [x] **0.1** ✅ (package.json + main.ts updated — `npm install` pending)
  ```bash
  npm install vuetify@^3.7.0 @mdi/font
  ```
  - Update `src/main.ts`: add MDI icon font import, configure Vuetify theme with MLB colors
  - MLB Theme config:
    ```typescript
    const vuetify = createVuetify({
      components,
      directives,
      theme: {
        themes: {
          light: {
            colors: {
              primary:   '#002D72',  // MLB Blue
              secondary: '#FFD700',  // Gold
              error:     '#D32F2E',
              warning:   '#FF6B35',
              success:   '#10A947',
            },
          },
        },
      },
    });
    ```
  - Error: N/A (install step)

- [x] **0.2** ✅
  ```bash
  npm install pinia
  ```
  - Add `import { createPinia } from 'pinia'` and `.use(createPinia())` to `main.ts`
  - Error: N/A (install step)

- [x] **0.3** ✅
  ```bash
  npm install -D vitest @vue/test-utils @vitest/ui jsdom
  ```
  - Add `test` script to `package.json`: `"test": "vitest"`
  - Add `vite.config.ts` test block: `test: { environment: 'jsdom' }`
  - Error: N/A (install step)

---

### Phase 1: Type System & Data Contracts 🧱

> **Why First**: TypeScript interfaces are compile-time contracts. All components and composables depend on these shapes. Zero ambiguity downstream.

- [x] **1.1** ✅

  ```typescript
  // src/types/models.ts

  /** ISO 8601 date string: "YYYY-MM-DD" */
  export type ISODateString = string;

  export interface DateRange {
    startDate: ISODateString | null;
    endDate:   ISODateString | null;
  }

  export type ValidationErrorCode =
    | 'END_BEFORE_START'
    | 'EXCEEDS_MAX_DAYS'
    | 'START_IN_PAST'
    | 'MISSING_START'
    | 'MISSING_END';

  export interface ValidationResult {
    valid:    boolean;
    error:    ValidationErrorCode | null;
    dayCount: number;          // 0 when invalid or same-day
    message:  string | null;   // human-readable zh-TW message
  }

  export interface TripDay {
    day:        number;
    date:       ISODateString;
    stadiumId:  string;
    travelKm:   number;
  }

  export interface Trip {
    tripId:         string;
    createdAt:      ISODateString;
    startDate:      ISODateString;
    endDate:        ISODateString;
    homeStadiumId:  string;
    itinerary:      TripDay[];
    totalDistance:  number;
    qualityScore:   number;
  }

  export const MAX_TRIP_DAYS = 180 as const;
  ```
  - Error: N/A (pure types — no runtime)

- [x] **1.2** ✅

  ```typescript
  // src/types/components.ts
  import type { ValidationResult, ISODateString } from './models';

  // ── DateRangePickerStart ──────────────────────────────────────
  export interface DateRangePickerStartProps {
    modelValue:   ISODateString | null;
    minDate:      ISODateString;          // today — enforced by v-date-picker min
    disabled?:    boolean;
    label?:       string;                 // default: "開始日期"
  }
  export interface DateRangePickerStartEmits {
    (e: 'update:modelValue', date: ISODateString | null): void;
  }

  // ── DateRangePickerEnd ────────────────────────────────────────
  export interface DateRangePickerEndProps {
    modelValue:   ISODateString | null;
    minDate:      ISODateString | null;   // = startDate (null = picker disabled)
    maxDate:      ISODateString | null;   // = startDate + 180 days
    disabled?:    boolean;
    label?:       string;                 // default: "結束日期"
  }
  export interface DateRangePickerEndEmits {
    (e: 'update:modelValue', date: ISODateString | null): void;
  }

  // ── DateRangeValidationFeedback ───────────────────────────────
  export interface DateRangeValidationFeedbackProps {
    result: ValidationResult;
  }
  // No emits — display-only

  // ── DateRangePicker (container) ───────────────────────────────
  export interface DateRangePickerProps {
    // Receives nothing — reads/writes directly to tripStore
  }
  export interface DateRangePickerEmits {
    (e: 'range-confirmed', range: { startDate: ISODateString; endDate: ISODateString }): void;
    (e: 'range-cleared'): void;
  }
  ```
  - Error: N/A (pure types)

- [x] **1.3** ✅

  ```typescript
  // src/types/index.ts
  export * from './models';
  export * from './components';
  ```
  - Error: N/A (re-export only)

---

### Phase 2: Pinia Store + Composable Logic 🧠

> **Why Second**: Composables can be unit-tested in isolation before any component exists. Store provides the single source of truth that all components read/write.

- [x] **2.1** ✅ `src/stores/tripStore.ts` — Pinia store with date state

  ```typescript
  // src/stores/tripStore.ts
  import { defineStore } from 'pinia';
  import { ref, computed } from 'vue';
  import type { ISODateString, Trip } from '@/types';

  export const useTripStore = defineStore('trip', () => {
    // ── State ───────────────────────────────────────────────────
    const startDate = ref<ISODateString | null>(null);
    const endDate   = ref<ISODateString | null>(null);
    const selectedTrip = ref<Trip | null>(null);
    const isLoading    = ref(false);
    const error        = ref<string | null>(null);

    // ── Getters ─────────────────────────────────────────────────
    const hasDateRange = computed(() => startDate.value !== null && endDate.value !== null);

    // ── Actions ─────────────────────────────────────────────────
    function setStartDate(date: ISODateString | null): void {
      startDate.value = date;
      // Clear endDate if it is now before new startDate
      if (date && endDate.value && endDate.value < date) {
        endDate.value = null;
      }
    }

    function setEndDate(date: ISODateString | null): void {
      endDate.value = date;
    }

    function clearDates(): void {
      startDate.value = null;
      endDate.value   = null;
    }

    return {
      startDate, endDate, selectedTrip, isLoading, error,
      hasDateRange,
      setStartDate, setEndDate, clearDates,
    };
  });
  ```
  - Error: Store actions are synchronous; no try/catch needed here. Validation lives in composable.

- [x] **2.2** ✅ `src/composables/useDateRange.ts` — validation logic + composable

  ```typescript
  // src/composables/useDateRange.ts
  import { computed } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useTripStore } from '@/stores/tripStore';
  import type { ValidationResult, ISODateString } from '@/types';
  import { MAX_TRIP_DAYS } from '@/types';

  // ── Pure helpers (exportable for testing) ───────────────────
  export function toDate(iso: ISODateString): Date {
    return new Date(iso + 'T00:00:00');   // avoid UTC midnight shift
  }

  export function todayISO(): ISODateString {
    return new Date().toISOString().slice(0, 10);
  }

  export function addDays(iso: ISODateString, days: number): ISODateString {
    const d = toDate(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  export function diffDays(from: ISODateString, to: ISODateString): number {
    return Math.round(
      (toDate(to).getTime() - toDate(from).getTime()) / 86_400_000
    );
  }

  // ── Validation pure function (no Vue dependency — easy to test) ──
  export function validateDateRange(
    startDate: ISODateString | null,
    endDate:   ISODateString | null,
  ): ValidationResult {
    const today = todayISO();

    if (!startDate) {
      return { valid: false, error: 'MISSING_START', dayCount: 0, message: '請選擇開始日期' };
    }
    if (startDate < today) {
      return { valid: false, error: 'START_IN_PAST', dayCount: 0, message: '開始日期不能是過去日期' };
    }
    if (!endDate) {
      return { valid: false, error: 'MISSING_END', dayCount: 0, message: '請選擇結束日期' };
    }
    if (endDate < startDate) {
      return { valid: false, error: 'END_BEFORE_START', dayCount: 0, message: '結束日期必須晚於或等於開始日期' };
    }
    const days = diffDays(startDate, endDate);
    if (days > MAX_TRIP_DAYS) {
      return {
        valid: false,
        error: 'EXCEEDS_MAX_DAYS',
        dayCount: days,
        message: `旅程不可超過 ${MAX_TRIP_DAYS} 天 (目前: ${days} 天)`,
      };
    }
    return { valid: true, error: null, dayCount: days, message: null };
  }

  // ── Composable (Vue reactive wrapper) ───────────────────────
  export function useDateRange() {
    const store = useTripStore();
    const { startDate, endDate } = storeToRefs(store);

    const today = computed(() => todayISO());

    const maxEndDate = computed(() =>
      startDate.value ? addDays(startDate.value, MAX_TRIP_DAYS) : null
    );

    const validation = computed<ValidationResult>(() =>
      validateDateRange(startDate.value, endDate.value)
    );

    function onStartDateChange(date: ISODateString | null): void {
      store.setStartDate(date);
    }

    function onEndDateChange(date: ISODateString | null): void {
      if (date === null) { store.setEndDate(null); return; }
      const result = validateDateRange(startDate.value, date);
      if (result.valid || result.error === 'MISSING_END') {
        store.setEndDate(date);
      }
      // If invalid, do NOT commit — UI shows computed validation error
    }

    function clearDates(): void {
      store.clearDates();
    }

    return {
      startDate,
      endDate,
      today,
      maxEndDate,
      validation,
      onStartDateChange,
      onEndDateChange,
      clearDates,
    };
  }
  ```
  - Error: `validateDateRange` never throws — always returns `ValidationResult`. Safe to call from computed.

- [x] **2.3** ✅ `src/composables/__tests__/useDateRange.spec.ts` — 12 unit tests

  File: `src/composables/__tests__/useDateRange.spec.ts`
  
  Test cases:
  - `validateDateRange(null, null)` → `error: 'MISSING_START'`
  - `validateDateRange('2020-01-01', null)` → `error: 'START_IN_PAST'`
  - `validateDateRange(today, null)` → `error: 'MISSING_END'`
  - `validateDateRange(today, yesterday)` → `error: 'END_BEFORE_START'`
  - `validateDateRange(today, +200days)` → `error: 'EXCEEDS_MAX_DAYS'`, `dayCount: 200`
  - `validateDateRange(today, today)` → `valid: true`, `dayCount: 0`
  - `validateDateRange(today, +30days)` → `valid: true`, `dayCount: 30`
  - `diffDays`, `addDays`, `todayISO` pure helper tests
  
  - Error: No async; tests are fully synchronous

---

### Phase 3: Atomic Components 🧩

> **Why Third**: All types (Phase 1) and logic (Phase 2) are in place. Components are pure UI wrappers — thin and testable.

#### 3.1 Atom — `DateRangePickerStart.vue`

- [x] **3.1** ✅ `src/components/control-panel/DateRangePickerStart.vue`

  ```typescript
  // TypeScript surface
  const props = defineProps<{
    modelValue: ISODateString | null;
    minDate:    ISODateString;           // = today
    disabled?:  boolean;
    label?:     string;
  }>();
  const emit = defineEmits<{
    (e: 'update:modelValue', date: ISODateString | null): void;
  }>();
  ```

  Template pattern:
  ```html
  <v-menu v-model="menuOpen" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="modelValue"
        :label="label ?? '開始日期'"
        :disabled="disabled"
        prepend-inner-icon="mdi-calendar-start"
        readonly
        clearable
        @click:clear="emit('update:modelValue', null)"
      />
    </template>
    <v-date-picker
      :model-value="modelValue"
      :min="minDate"
      color="primary"
      @update:model-value="onDateSelected"
    />
  </v-menu>
  ```

  - State: `menuOpen = ref(false)` — local only; closes after selection
  - Error: Disabled state if `props.disabled = true`; `min` prop blocks past dates at Vuetify level

#### 3.2 Atom — `DateRangePickerEnd.vue`

- [x] **3.2** ✅ `src/components/control-panel/DateRangePickerEnd.vue`

  ```typescript
  const props = defineProps<{
    modelValue: ISODateString | null;
    minDate:    ISODateString | null;   // = startDate (null = disable picker)
    maxDate:    ISODateString | null;   // = startDate + 180 days
    disabled?:  boolean;
    label?:     string;
    hasError?:  boolean;               // drives v-text-field :error
    errorMsg?:  string | null;
  }>();
  const emit = defineEmits<{
    (e: 'update:modelValue', date: ISODateString | null): void;
  }>();
  ```

  Key detail: When `minDate` is null (no startDate selected), the entire field is `disabled`.
  
  - State: Local `menuOpen = ref(false)`
  - Error: Shows `errorMsg` via `v-text-field :error-messages`; `hasError` turns field red

#### 3.3 Atom — `DateRangeValidationFeedback.vue`

- [x] **3.3** ✅ `src/components/control-panel/DateRangeValidationFeedback.vue`

  ```typescript
  const props = defineProps<{
    result: ValidationResult;
  }>();
  // No emits — display only
  ```

  Template: `v-alert` with `type="error"` shown only when `result.error !== null && result.message !== null`.
  Also renders a success chip `"✓ X 天"` when `result.valid === true` and `result.dayCount > 0`.
  
  ```html
  <template>
    <v-alert v-if="props.result.error && props.result.message"
      type="error" density="compact" variant="tonal" class="mt-2">
      {{ props.result.message }}
    </v-alert>
    <v-chip v-else-if="props.result.valid && props.result.dayCount > 0"
      color="success" size="small" class="mt-2">
      ✓ {{ props.result.dayCount }} 天的旅程
    </v-chip>
  </template>
  ```

  - Error: N/A — display only, no side effects

#### 3.4 Molecule — `DateRangePicker.vue` (Container)

- [x] **3.4** ✅ `src/components/control-panel/DateRangePicker.vue` — container with watcher cleanup

  ```typescript
  // No props — reads/writes tripStore directly via useDateRange()
  const emit = defineEmits<{
    (e: 'range-confirmed', range: { startDate: string; endDate: string }): void;
    (e: 'range-cleared'): void;
  }>();

  const {
    startDate, endDate, today, maxEndDate,
    validation, onStartDateChange, onEndDateChange, clearDates,
  } = useDateRange();
  ```

  Responsibilities:
  - Renders `DateRangePickerStart` + `DateRangePickerEnd` + `DateRangeValidationFeedback` side by side
  - Shows "清除日期" button (calls `clearDates()`, emits `range-cleared`)
  - Emits `range-confirmed` when `validation.value.valid === true` (watch on validation)
  - Passes `hasError` + `errorMsg` down to `DateRangePickerEnd` based on `validation.value`

  Layout structure:
  ```html
  <v-card variant="outlined" class="pa-4">
    <v-card-title class="text-primary">選擇旅遊日期</v-card-title>
    <v-row align="center" class="mt-2">
      <v-col cols="12" sm="5">
        <DateRangePickerStart v-model="startDate" :min-date="today" />
      </v-col>
      <v-col cols="12" sm="2" class="text-center">
        <v-icon>mdi-arrow-right</v-icon>
      </v-col>
      <v-col cols="12" sm="5">
        <DateRangePickerEnd
          v-model="endDate"
          :min-date="startDate"
          :max-date="maxEndDate"
          :has-error="!!validation.error && ['END_BEFORE_START','EXCEEDS_MAX_DAYS'].includes(validation.error)"
          :error-msg="validation.message"
        />
      </v-col>
    </v-row>
    <DateRangeValidationFeedback :result="validation" />
    <v-btn v-if="startDate || endDate" variant="text" size="small"
      class="mt-2" color="warning" @click="handleClear">
      清除日期
    </v-btn>
  </v-card>
  ```

  - Error: `watch(validation, ...)` fires `range-confirmed` emit only when valid; no error thrown

---

### Phase 4: Error Handling & Edge Cases 🛡️

> **Why Fourth**: Components exist — now harden against misuse, stale state, and corner cases.

- [ ] **4.1** Guard startDate change → auto-clear invalid endDate in store **(30 min)**

  This is already in `tripStore.setStartDate()` (from task 2.1). Verification task:
  - Write a test: set `startDate = "2025-08-01"`, `endDate = "2025-08-20"`, then `setStartDate("2025-08-25")`
  - Assert `endDate === null` after the call
  - Error: N/A

- [ ] **4.2** Handle `DateRangePickerEnd` disabled state when no startDate **(30 min)**

  - When `startDate === null`, `DateRangePickerEnd` receives `minDate = null`
  - Component must render with `disabled = true` and show tooltip "請先選擇開始日期"
  - Implement via `computed(() => props.minDate === null)` controlling `:disabled`
  - Error: No error — graceful UI degradation

- [ ] **4.3** Prevent invalid endDate from reaching the store **(already in 2.2)** — verify wiring **(20 min)**

  - In `DateRangePicker.vue`, the `v-model` on `DateRangePickerEnd` calls `onEndDateChange`
  - `onEndDateChange` in composable rejects values that fail validation
  - Verify: select a future startDate, then manually pass an endDate that precedes it → store should remain unchanged
  - Error: Rejection is silent at store level; UI shows error via computed `validation`

- [ ] **4.4** Handle Vuetify `v-date-picker` model-value format normalization **(30 min)**

  - Vuetify 3's `v-date-picker` may emit `Date` objects OR `string` depending on version/config
  - Add normalization helper in each picker atom:
    ```typescript
    function normalizeDate(val: Date | string | null): ISODateString | null {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') return val.slice(0, 10);
      return val.toISOString().slice(0, 10);
    }
    ```
  - Use this in the `@update:model-value` handler inside each atom
  - Error: If format unexpected, returns `null` and triggers `MISSING_END/START` error path

- [ ] **4.5** Add `onBeforeUnmount` cleanup in `DateRangePicker.vue` **(20 min)**

  - If a `watch` or side-effect was added in Phase 3.4 (e.g., `watch(validation, emitConfirmed)`), ensure the watcher is stored and stopped:
    ```typescript
    const stopWatcher = watch(validation, (val) => {
      if (val.valid && startDate.value && endDate.value) {
        emit('range-confirmed', { startDate: startDate.value, endDate: endDate.value });
      }
    });
    onBeforeUnmount(() => stopWatcher());
    ```
  - Error: Memory leak prevention — no functional impact

---

### Phase 5: Integration & Testing ✅

> **Why Final**: All units built and hardened. Validate the whole system behaves per the BDD scenarios.

- [ ] **5.1** Wire `DateRangePicker` into `src/App.vue` (smoke test layout) **(30 min)**

  - Replace `<HelloWorld />` placeholder with `<DateRangePicker />` in a centered `v-container`
  - Confirm Vuetify theme colors apply (MLB Blue toolbar + picker highlight)
  - Confirm no TypeScript compile errors: `npm run type-check`
  - Error: If Vuetify theme not applied, check `main.ts` theme registration (task 0.1)

- [ ] **5.2** Write component tests for `DateRangePickerStart.vue` **(1h)**

  File: `src/components/control-panel/__tests__/DateRangePickerStart.spec.ts`
  
  Tests:
  - Renders text field with label "開始日期"
  - Emits `update:modelValue` with correct ISO string when date picked
  - Emits `update:modelValue` with `null` when cleared
  - Does not render dates before today (integration with Vuetify min prop)

- [ ] **5.3** Write component tests for `DateRangePickerEnd.vue` **(1h)**

  Tests:
  - Renders as disabled when `minDate = null`
  - Shows `errorMsg` text when `hasError = true`
  - Emits correct value on selection

- [ ] **5.4** Write integration test for `DateRangePicker.vue` container **(1.5h)**

  File: `src/components/control-panel/__tests__/DateRangePicker.spec.ts`
  
  Tests:
  - Happy path: select startDate + valid endDate → `range-confirmed` emitted
  - Clear button click → store cleared, `range-cleared` emitted
  - Invalid endDate → no emit, validation feedback visible
  - Change startDate to after endDate → endDate cleared automatically

- [ ] **5.5** End-to-end BDD scenario validation (manual + automated) **(1h)**

  Verify all 7 BDD scenarios from this document by running `npm run dev`:
  - [ ] Scenario 1: Happy path
  - [ ] Scenario 2: Past date blocked
  - [ ] Scenario 3: endDate before startDate
  - [ ] Scenario 4: >180 days
  - [ ] Scenario 5: Same-day trip
  - [ ] Scenario 6: Clear/reset
  - [ ] Scenario 7: startDate change re-validates

- [ ] **5.6** Accessibility audit for date pickers **(30 min)**

  - Confirm each `v-text-field` has accessible label text
  - Confirm keyboard navigation works: Tab to field → Enter to open picker → Arrow keys → Enter to select
  - Confirm error messages are announced by screen reader (`role="alert"` on `v-alert`)

---

## 📊 Priority Matrix

| Task     | Priority    | Effort   | Blocks                  |
| -------- | ----------- | -------- | ----------------------- |
| 0.1–0.3  | 🔴 CRITICAL | 1.5h     | Everything              |
| 1.1–1.3  | 🔴 CRITICAL | 2.25h    | Phases 2, 3, 4, 5       |
| 2.1      | 🔴 CRITICAL | 1h       | 2.2, 3.4, 5.x           |
| 2.2      | 🔴 CRITICAL | 1.5h     | 3.4, 4.x, 5.x           |
| 2.3      | 🟡 HIGH     | 1.5h     | Can run parallel w/ 3.x |
| 3.1      | 🟡 HIGH     | 1h       | 3.4                     |
| 3.2      | 🟡 HIGH     | 1h       | 3.4                     |
| 3.3      | 🟡 HIGH     | 0.5h     | 3.4                     |
| 3.4      | 🟡 HIGH     | 1.5h     | 4.x, 5.x                |
| 4.1–4.5  | 🟠 MEDIUM   | 2h       | 5.x                     |
| 5.1–5.6  | 🟠 MEDIUM   | 5.5h     | Ship gate               |

---

## ⏱️ Effort Estimation

| Phase                       | Tasks  | Estimated Hours |
| --------------------------- | ------ | --------------- |
| Phase 0 (Prerequisites)     | 3      | 1.5h            |
| Phase 1 (Type System)       | 3      | 2.25h           |
| Phase 2 (Store + Composable)| 3      | 4h              |
| Phase 3 (Components)        | 4      | 4h              |
| Phase 4 (Error Hardening)   | 5      | 1.75h           |
| Phase 5 (Integration/Tests) | 6      | 5.5h            |
| **Total**                   | **24** | **~19h**        |

> **Optimized parallel (Phases 2.3 ∥ 3.x)**: ~14h
> **Buffer (+20% for iteration)**: ~17–23h realistic

---

## 🔗 Dependencies & Critical Path

```
Phase 0 (Install Vuetify + Pinia + Vitest): 1.5h
  │
  ▼
Phase 1 (Types): 2.25h
  │
  ▼
Phase 2.1 (tripStore): 1h ──┐
  │                          │
  ▼                          │
Phase 2.2 (useDateRange): 1.5h  ◄──────────────┐
  │                                              │
  ├──► Phase 2.3 (composable tests): 1.5h       │
  │    [parallel with Phase 3.1–3.3]            │
  ▼                                              │
Phase 3.1 DateRangePickerStart: 1h              │
Phase 3.2 DateRangePickerEnd:   1h              │  [parallel]
Phase 3.3 ValidationFeedback:  0.5h             │
  │                                              │
  ▼                                              │
Phase 3.4 DateRangePicker container: 1.5h ──────┘
  │
  ▼
Phase 4 (Hardening): 1.75h
  │
  ▼
Phase 5 (Integration + Tests): 5.5h
  │
  ▼
✅ F-01 DONE
```

**Critical Path**: 0 → 1 → 2.1 → 2.2 → 3.4 → 4 → 5 (~12h sequential)

---

## ✅ Acceptance Criteria (Per Phase)

### Phase 0
- [ ] `npm install` succeeds with Vuetify 3, Pinia, Vitest added to `package.json`
- [ ] `npm run dev` renders MLB Blue app bar without console errors
- [ ] Pinia devtools visible in Vue DevTools browser extension

### Phase 1
- [ ] `npm run type-check` passes with zero errors
- [ ] No `any` types in `types/*.ts`
- [ ] All `ValidationErrorCode` values are used by at least one scenario

### Phase 2
- [ ] `npm run test` passes all `useDateRange.spec.ts` tests (≥ 10 cases)
- [ ] `validateDateRange` is a pure function — no Vue/Pinia imports
- [ ] `tripStore.setStartDate` auto-clears invalid endDate (tested)

### Phase 3
- [ ] All 3 atom components accept only typed props (no `any`)
- [ ] `DateRangePicker.vue` uses `useDateRange()` with no direct store access
- [ ] Vuetify `v-date-picker` past dates are visually disabled

### Phase 4
- [ ] No unhandled `null` crashes when dates are partially set
- [ ] Watcher in container is stopped on `onBeforeUnmount`
- [ ] Vuetify date picker format is normalized to `YYYY-MM-DD` in all cases

### Phase 5
- [ ] All 7 BDD scenarios pass manual verification
- [ ] `npm run test` reports ≥ 80% coverage for composable + container
- [ ] Zero TypeScript strict-mode errors: `npm run type-check`
- [ ] `npm run lint` reports zero violations

---

## ⚠️ Known Risks & Anti-Patterns to Avoid

| Risk | Description | Mitigation |
|------|-------------|------------|
| 🔴 Vuetify date emit format | `v-date-picker` may emit `Date` object or `string` | Normalize in task 4.4 |
| 🟠 Vuetify 3 `v-date-picker` API | Component API changed across v3 minor versions | Test with exact installed version; use `v-menu` + `v-date-picker` pattern |
| 🟡 Pinia not in package.json | Missing from deps despite usage in code | Task 0.2 is blocking |
| 🟡 `new Date(isoString)` UTC shift | `new Date("2025-08-01")` gives `2025-07-31T17:00` in UTC-7 | Always append `T00:00:00` (handled in `toDate()` helper) |
| 🟡 Prop drilling temptation | Avoid passing `startDate`/`endDate` through 3+ component levels | Use `useDateRange()` composable which reads from store directly |

---

*Generated by BDD Requirements Expert · F-01 Date Range Selection*
*Last updated: 2025-07-01*
