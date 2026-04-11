# Code Review — F-03 Quick Start Presets

**審查範圍**: F-03 及所有前置功能（F-01 DateRangePicker、F-02 StadiumSelector、共用 types/store/service）  
**審查日期**: 2025-04-11  
**審查員**: BDD Code Executor (Senior Frontend Engineer)  
**基準 commit**: `fe46886`

---

## 1. Executive Summary

| 嚴重等級 | 數量 | 說明 |
|----------|------|------|
| 🔴 P0 — 必修 Bug    | 3 | 會在生產環境或使用者操作中直接出錯 |
| 🟠 P1 — 高優先架構缺陷 | 3 | 不會即刻崩潰，但會在 F-04/F-05 擴充時造成破壞 |
| 🟡 P2 — 中優先改善    | 4 | 型別安全漏洞、設計不一致 |
| 🟢 P3 — 建議優化      | 3 | 可讀性與可維護性 |

**整體評分**: **6.5 / 10** — F-03 核心邏輯（composable 防禦模式、desync watcher、isApplyingPreset guard）設計精良，但存在 3 個 P0 級別問題需在下次 commit 前修正。

---

## 2. 🔴 P0 — 必修 Bug

### P0-1：「清除日期」按鈕未移除 — `DateRangePicker.vue`

**位置**: `src/components/control-panel/DateRangePicker.vue` L96–107  
**狀態**: ❌ 使用者明確要求移除，但此次審查確認程式碼**仍然存在**。

```vue
<!-- 這段應該被刪除 -->
<v-btn
  v-if="startDate || endDate"
  variant="text"
  size="small"
  class="mt-2"
  color="secondary"
  prepend-icon="mdi-close-circle"
  @click="handleClear"
>
  清除日期
</v-btn>
```

**連帶問題**: 以下相關程式碼也應一併移除：
- `DateRangePicker.vue` L11: `(e: 'range-cleared'): void;` emit 宣告
- `DateRangePicker.vue` L25: `clearDates,` 解構賦值（但不移除 useDateRange 中的 clearDates 本身）
- `DateRangePicker.vue` L53-57: `handleClear()` 函式
- `src/types/components.ts` L51: `DateRangePickerEmits` 中的 `range-cleared` 行

> **風險**: App.vue 已移除 `@range-cleared` 監聽器，但 DateRangePicker.vue 仍然 emit，這在 Vue DevTools 中會出現 unhandled emit 警告，也讓 `components.ts` 的介面宣告與實際行為不一致。

---

### P0-2：時區 Bug — `todayISO()` 使用 UTC 日期

**位置**: `src/composables/useDateRange.ts` L15  
**狀態**: ❌ 在 UTC+8（台灣）環境中，每天午夜前會傳回昨天的日期。

```typescript
// ❌ 當前實作 — 使用 UTC 日期
export function todayISO(): ISODateString {
  return new Date().toISOString().slice(0, 10);  // UTC 日期
}

// ✅ 正確實作 — 使用本地日期
export function todayISO(): ISODateString {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

> **風險**: F-03 的 `applyPreset()` 呼叫 `todayISO()` 作為 startDate。在台灣晚上 11:59 套用預設時，startDate 會設為昨天（UTC 日期），導致 `validateDateRange` 回傳 `START_IN_PAST`，行程套用靜默失效。

> **補記**: `addDays()` 已正確使用本地 date parts，但 `DateRangePickerStart/End.vue` 的 `normalizeDate()` 仍有相同問題（`val.toISOString().slice(0, 10)`）。

---

### P0-3：`requestTripGeneration()` 無法觸發第二次 — `tripStore.ts`

**位置**: `src/stores/tripStore.ts` L43–47  
**狀態**: ❌ `tripGenerationRequested` 從 `false` → `true` 後永不重置，F-04 的 watcher 第二次呼叫時偵測不到變化。

```typescript
// ❌ 當前實作
function requestTripGeneration(): void {
  tripGenerationRequested.value = true;  // 第二次呼叫：true → true = 無 reactive 變化
}

// ✅ 正確實作 — 使用計數器或 toggle
const tripGenerationRequestId = ref<number>(0);

function requestTripGeneration(): void {
  tripGenerationRequestId.value += 1;  // 每次都有變化，watcher 必定觸發
  console.info('[F-03 → F-04 hook] requestTripGeneration called, id:', tripGenerationRequestId.value);
}
```

> **風險**: 使用者套用同一個 preset 兩次（或先套用再手動修改再套用），F-04 只會執行一次路線計算。這在 F-04 實作後會成為難以追蹤的隱性 bug。

---

## 3. 🟠 P1 — 高優先架構缺陷

### P1-1：`stadiumService.ts` 不安全的型別轉換

**位置**: `src/services/stadiumService.ts` L17

```typescript
// ❌ 強制轉型，無執行期驗證
return { stadiums: raw as Stadium[], error: null };
```

`raw` 是 `unknown`，`as Stadium[]` 在 TypeScript 編譯後完全消失。如果 `stadiums.json` 的欄位改名或型別變更，runtime 不會報錯，而是讓下游元件靜默使用 `undefined` 值。

**建議**: 加入最小化欄位驗證：

```typescript
function isStadiumArray(data: unknown): data is Stadium[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return (
    typeof first['id'] === 'string' &&
    typeof first['teamName'] === 'string' &&
    typeof first['coordinates'] === 'object'
  );
}

// 取代 `raw as Stadium[]`
if (!isStadiumArray(raw)) {
  return { stadiums: [], error: 'PARSE_ERROR' };
}
return { stadiums: raw, error: null };
```

---

### P1-2：`App.vue` 殘留 debug `console.log`

**位置**: `src/App.vue` L37

```vue
<!-- ❌ 生產環境不應有 console.log -->
<DateRangePicker
  @range-confirmed="(r) => console.log('confirmed', r)"
/>
```

這個事件應交由 store（`useTripStore`）統一管理，或在 `App.vue` 中有實質性的 handler。目前的寫法：
1. 在生產 build 中輸出不必要的 console 訊息
2. 沒有將 `range-confirmed` 事件的資料整合進任何應用狀態

**建議**: 至少移除 console.log，待 F-04 實作後補上真正的 handler：

```typescript
// App.vue <script setup>
function onRangeConfirmed(_range: { startDate: ISODateString; endDate: ISODateString }): void {
  // F-04 integration hook: trigger game filtering
}
```

---

### P1-3：`useDateRange` 返回孤兒狀態 `clearDates`

**位置**: `src/composables/useDateRange.ts` L98–106  
若 P0-1 修正完成（移除清除日期按鈕），`clearDates` 在 composable 的 return 中將成為**無人消費的死代碼**。這不是即刻問題，但會造成未來維護者困惑：「這個 function 從哪裡被呼叫？」

**建議**: 修正 P0-1 後，從 composable return 移除 `clearDates`（保留函式本身在 store，供未來需求使用）。

---

## 4. 🟡 P2 — 型別安全漏洞

### P2-1：`ISODateString` 是 nominal alias 而非 branded type

**位置**: `src/types/models.ts` L4

```typescript
// ❌ 任何字串都可以賦值給 ISODateString
export type ISODateString = string;

// 例如：以下不會有 TS 錯誤
const notADate: ISODateString = 'hello world'; // 完全合法
```

**建議**: 使用 branded type 防止誤用：

```typescript
export type ISODateString = string & { readonly __brand: 'ISODate' };

// 在 todayISO() / addDays() 的回傳值加上 as ISODateString
export function todayISO(): ISODateString {
  // ...
  return `${y}-${m}-${day}` as ISODateString;
}
```

> 注意：若採用此改動，整個 codebase 中所有字串 literal 指派給 `ISODateString` 的地方都需要加 `as ISODateString`。建議在獨立 PR 中處理。

---

### P2-2：`tripStore.error` 型別過於寬鬆

**位置**: `src/stores/tripStore.ts` L11

```typescript
const error = ref<string | null>(null); // ❌ 太寬鬆
```

專案已在 `models.ts` 中定義 `StadiumLoadErrorCode`，但 store 的 error 仍是裸字串。建議定義 union type：

```typescript
export type TripErrorCode = StadiumLoadErrorCode | 'ROUTING_FAILED' | 'GAME_FILTER_FAILED';
const error = ref<TripErrorCode | null>(null);
```

---

### P2-3：`DateRangePickerEnd.vue` `normalizeDate` 有時區 bug

**位置**: `src/components/control-panel/DateRangePickerEnd.vue` L26

```typescript
// ❌ 同 P0-2：Date 物件 toISOString() 使用 UTC
return val.toISOString().slice(0, 10);

// ✅ 應使用本地日期
const y = val.getFullYear();
const m = String(val.getMonth() + 1).padStart(2, '0');
const d = String(val.getDate()).padStart(2, '0');
return `${y}-${m}-${d}` as ISODateString;
```

`DateRangePickerStart.vue` L21 也有相同問題。

---

### P2-4：`v-chip` 巢狀於 `v-btn` 內部

**位置**: `src/components/control-panel/PresetBadge.vue` L31–36

```vue
<v-btn ...>
  <span>{{ preset.name }}</span>
  <v-chip ...>  <!-- ❌ 非標準：chip 嵌套在 button 內 -->
    {{ preset.durationDays }}天
  </v-chip>
</v-btn>
```

Vuetify 未正式支援此嵌套模式，可能在某些版本出現：
- Ripple 效果雙重觸發
- ARIA 角色衝突（button 內有 interactive chip）
- 未來 Vuetify 版本升級後樣式破壞

**建議**: 以純 `<span>` 加 CSS 樣式取代 `v-chip`：

```vue
<v-btn ...>
  <span class="preset-emoji mr-1">{{ preset.emoji }}</span>
  <span class="preset-name">{{ preset.name }}</span>
  <span class="preset-days ml-1">{{ preset.durationDays }}天</span>
</v-btn>
```

---

## 5. 🟢 P3 — 建議優化

### P3-1：`QuickStartPresets.vue` 缺少 loading 狀態整合

目前 `QuickStartPresets` 沒有接收或顯示全域 loading 狀態（`tripStore.isLoading`）。當 F-04 觸發路線計算時，按鈕應被 disable 以防重複套用。

```vue
<!-- 建議加入 -->
const tripStore = useTripStore();
:disabled="disabled || tripStore.isLoading"
```

---

### P3-2：`useQuickStartPresets.ts` DEV 驗證的效能考慮

```typescript
// src/composables/useQuickStartPresets.ts L53–68
if (import.meta.env.DEV) {
  onMounted(async () => {
    const result = await loadStadiums(); // 每次組件掛載都觸發一次 dynamic import
  });
}
```

`loadStadiums()` 每次 `QuickStartPresets.vue` 掛載時都執行一次 dynamic import。雖然 DEV only，但如果 `useQuickStartPresets` 未來被多個元件使用，會造成重複驗證。

**建議**: 用 module-level flag 確保只執行一次：

```typescript
let devValidationDone = false;

if (import.meta.env.DEV) {
  onMounted(async () => {
    if (devValidationDone) return;
    devValidationDone = true;
    // ... validation logic
  });
}
```

---

### P3-3：測試日期固定值不一致

`useDateRange.spec.ts` 使用 `FIXED_TODAY = '2026-04-06'`，  
`useQuickStartPresets.spec.ts` 使用 `MOCK_TODAY = '2025-07-01'`。

建議在 `src/test-utils/constants.ts` 中統一定義：

```typescript
export const TEST_DATE_TODAY = '2025-07-01';
export const TEST_DATE_FIXED = '2026-04-06';
```

---

## 6. ✅ Positive Observations — 做得好的地方

| 項目 | 說明 |
|------|------|
| **isApplyingPreset guard** | 使用 plain boolean（非 ref）阻止 desync watcher 誤觸，nextTick 時序控制正確 |
| **Atomic Design 層級** | Atom → Molecule → Organism 層級分明，PresetBadge/PresetButtonGroup/QuickStartPresets 職責清晰 |
| **Props readonly** | `QuickStartPreset` 所有欄位都是 `readonly`，防止子元件意外修改 |
| **aria-label / aria-pressed** | PresetBadge 加入了正確的 ARIA 屬性，可訪問性良好 |
| **jsdom disabled 防禦** | `if (props.disabled) return` 明確處理 jsdom 不尊重 HTML disabled 的已知問題 |
| **addDays 時區修正** | `addDays()` 正確使用本地 date parts，避免時區 off-by-1 |
| **78 個測試** | composable 測試覆蓋率高，包含 desync watcher 場景 |
| **`as const` + `readonly`** | `QUICK_START_PRESETS` 雙重不可變保護，字面值型別保留 |
| **F-04 hook stub** | `requestTripGeneration()` 的 console.info marker 清楚標示整合點 |

---

## 7. Test Coverage Summary

| 檔案 | 測試數 | 已覆蓋場景 | 缺漏 |
|------|--------|-----------|------|
| `useQuickStartPresets.spec.ts` | 44 | applyPreset 完整流程、desync watcher、snackbar | - |
| `presets.spec.ts` | 8 | 資料完整性 | - |
| `PresetBadge.spec.ts` | 11 | disabled guard、aria、emit | - |
| `PresetButtonGroup.spec.ts` | 6 | 正確傳遞 activePresetId | - |
| `QuickStartPresets.spec.ts` | 9 | 整合流程、snackbar 顯示 | - |
| `useDateRange.spec.ts` | ~20 | 純函式驗證 | `todayISO()` UTC bug 未覆蓋 |
| `stadiumService` | 無獨立測試 | — | ❌ 缺 happy path + PARSE_ERROR |

---

## 8. Action Items Checklist

優先順序排列（建議在下次 commit 前完成 P0）：

### 必修 (P0) — 下次 commit 前
- [ ] **P0-1**: 從 `DateRangePicker.vue` 移除清除日期按鈕、`handleClear()`、`range-cleared` emit；同步修正 `components.ts` 的 `DateRangePickerEmits`
- [ ] **P0-2**: 修正 `todayISO()` 使用本地 date parts；同步修正 `DateRangePickerStart/End.vue` 的 `normalizeDate()`
- [ ] **P0-3**: 將 `tripGenerationRequested` 改為 counter（`ref<number>(0)`），確保第二次呼叫能觸發 F-04 watcher

### 高優先 (P1) — 本 sprint 內
- [ ] **P1-1**: `stadiumService.ts` 加入 `isStadiumArray()` 執行期型別守衛
- [ ] **P1-2**: `App.vue` 移除 `console.log`，補上正確的 F-04 hook 占位 handler
- [ ] **P1-3**: 修正 P0-1 後，從 `useDateRange` return 移除 `clearDates`

### 中優先 (P2) — 下個 sprint
- [ ] **P2-3**: 修正 `DateRangePickerStart/End.vue` 的 `normalizeDate` 時區 bug（與 P0-2 一起做）
- [ ] **P2-4**: 以純 `<span>` 取代 `PresetBadge.vue` 中的 `v-chip`
- [ ] 新增 `stadiumService.ts` 的單元測試

### 建議 (P3) — 有空再做
- [ ] **P3-1**: `QuickStartPresets` 整合 `tripStore.isLoading` 至 disabled 狀態
- [ ] **P3-2**: `useQuickStartPresets.ts` DEV 驗證加入 module-level done flag
- [ ] **P3-3**: 統一測試日期常數至 `src/test-utils/constants.ts`

---

*本報告由 BDD Code Executor Agent 產出，基於靜態分析與架構原則審查。如需討論任何條目，請 @reviewer。*
