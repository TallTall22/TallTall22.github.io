# Code Review — F-02: Home Stadium Selection

| Field    | Value                      |
|----------|----------------------------|
| Date     | 2026-04-08                 |
| Reviewer | GitHub Copilot             |
| Feature  | F-02 Home Stadium Selection|
| Verdict  | **8.5 / 10**               |

---

## Executive Summary

The F-02 implementation is functionally sound with excellent type safety and 26/26 tests passing. Three critical issues need fixing before merge: a race condition in `useStadiumSelector` (component unmount during async fetch), an Oakland Athletics coordinate error (1.19 km off), and city name not being searchable despite the placeholder promising it. Significant issues include an unused `PARSE_ERROR` code path and redundant dual-responsibility emits in `StadiumSelector.vue`. Overall the architecture is clean and the data quality is high.

---

## Critical Issues

### C-1 — Race condition in `useStadiumSelector.ts` (lines 51–57)

The `onMounted` async callback does not guard against component unmount. If the component is destroyed before `loadStadiums()` resolves, the callback still writes to `stadiums.value`, `loadError.value`, and `isLoading.value` on a dead instance — a classic async teardown bug that can cause memory leaks and Vue warnings.

**Fix:** Add an `isMounted` flag and bail out after the `await`:

```typescript
onMounted(async () => {
  isLoading.value = true;
  let isMounted = true;
  onBeforeUnmount(() => { isMounted = false; });

  const result = await loadStadiums();

  if (!isMounted) return;

  stadiums.value = result.stadiums;
  loadError.value = result.error;
  isLoading.value = false;
});
```

---

### C-2 — Wrong OAK coordinates in `stadiums.json`

The Oakland/Sacramento Athletics entry has `"lng": -121.5001`, which is 1.19 km away from the correct Sutter Health Park longitude.

**Fix:** Change the `OAK` coordinates:

```json
"coordinates": { "lat": 38.5803, "lng": -121.5138 }
```

---

### C-3 — City not included in searchable label (`useStadiumSelector.ts` line 32)

The `v-autocomplete` placeholder reads *"搜尋城市、球隊或球場名稱"* (search city, team, or stadium), but the generated `label` field only contains `${teamName} — ${stadiumName}`. Searching by city name returns no results, breaking the implied contract.

**Fix:** Append the city to the label:

```typescript
label: `${s.teamName} — ${s.stadiumName} (${s.city})`
```

---

## Significant Issues

### S-1 — `PARSE_ERROR` defined but never returned (`stadiumService.ts`)

`StadiumLoadErrorCode` declares `'PARSE_ERROR'` but the catch block always returns `'FETCH_FAILED'` regardless of error type, and the `!Array.isArray(raw)` guard conflates an empty-data scenario with a parse failure by returning `'EMPTY_DATA'`.

**Fix:** Separate concerns in the service:

```typescript
if (!Array.isArray(raw)) {
  return { stadiums: [], error: 'PARSE_ERROR' };
}
if (raw.length === 0) {
  return { stadiums: [], error: 'EMPTY_DATA' };
}
// ...
} catch (err) {
  if (err instanceof SyntaxError) {
    return { stadiums: [], error: 'PARSE_ERROR' };
  }
  return { stadiums: [], error: 'FETCH_FAILED' };
}
```

---

### S-2 — `StadiumSelector.vue` has dual responsibility (store write + emit)

The component both calls `onSelect(value)` (which writes to the Pinia store) *and* fires `emit('stadium-selected', ...)` / `emit('stadium-cleared')`. `App.vue` only `console.log`s those events — they are redundant. Dual responsibility makes the component harder to reason about and violates the single-responsibility principle.

**Fix:** Remove `defineEmits`, the `StadiumSelectorEmits` interface, and the emit calls. Simplify `handleUpdate` to only call `onSelect(value)`. Remove the event listeners in `App.vue`.

---

## Minor Issues

### M-1 — Repeated cast `(item.raw as StadiumSelectorOption)` × 8

The same type cast appears eight times across the template. Extract a typed helper or use a scoped typed variable in each slot to improve readability.

### M-2 — `officialsWebsite` marked optional but present on all 30 entries

The `Stadium` interface marks `officialsWebsite` as optional (`?`), but all 30 JSON entries provide it. Either remove the optional marker (making the type stricter) or document intentionally that future entries may omit it.

### M-3 — `isLoading` timing test can be flaky in CI

The deferred-promise pattern in the `isLoading` test relies on microtask scheduling assumptions. In a heavily loaded CI environment this can produce false positives/negatives. Consider `vi.useFakeTimers()` or explicitly awaiting a settled promise to make it deterministic.

---

## Strengths

1. **Zero `any` types in production code** — all refs and computed values are fully typed, including the `unknown` cast before `Array.isArray()` narrowing.
2. **`stadiumService` is a pure function** — no side effects, no singletons; trivially mockable with `vi.spyOn`.
3. **`loadStadiums()` never throws** — all three UI states (data, loading, error) are handled, preventing uncaught promise rejections.
4. **`addDays` UTC bug fix is correct** — the implementation correctly avoids daylight-saving-time drift by operating in UTC.
5. **Data quality: 30 teams, 15 AL / 15 NL, correct Athletics 2026 location** (Sacramento / Sutter Health Park).
6. **Dynamic import enables Vite code-splitting** — `stadiums.json` lands in an 11 kB separate chunk, keeping the initial bundle lean.

---

## Fix Priority

| Issue            | Priority    | Effort |
|------------------|-------------|--------|
| C-1 unmount guard | Critical   | 10 min |
| C-2 OAK coordinates | Critical | 2 min  |
| C-3 city in search  | Critical | 2 min  |
| S-1 PARSE_ERROR     | Significant | 10 min |
| S-2 remove emits    | Significant | 15 min |

---

## Final Verdict

Fix the 3 critical issues before merging. Significant issues can follow in a cleanup PR. Minor items are left to team discretion.
