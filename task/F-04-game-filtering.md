# F-04 TODO — 賽事篩選 (Game Filtering)

> 📝 **文件版本**: v1.0 | 對應 Feature: F-04 | 上游依賴: F-01 (DateRange), F-03 (QuickStartPresets hook) | 下游: F-05 (Routing Algorithm)

---

## Executive Summary

**What**: 實作賽事資料的載入、清洗與篩選管線——從 `games.json` 靜態資產讀取完整賽季賽程（~2,430 場），依使用者設定的日期區間過濾、僅保留主場賽事、移除重複 gameId、並按日期升冪排序，最終產出乾淨的 `Game[]` 供 F-05 貪婪演算法消費。

**Why**: F-05 的路線規劃品質完全取決於輸入資料的正確性。若日期過濾錯誤、主客場混淆或重複賽事未清除，貪婪演算法將產生不可行的行程。

**Scope Boundaries**:
- ✅ IN: `gameService.ts` 載入邏輯、`useGameFilter.ts` 純函式 + 響應式整合、型別系統、`tripStore` watcher 接線、單元測試
- ❌ OUT: `games.json` 資料爬取/生成腳本（獨立任務）、F-05 貪婪演算法本體、任何 UI 元件、地圖顯示

---

## Given-When-Then Scenarios

### Scenario 1: 正常篩選流程（Happy Path）

```
Given:  tripStore.startDate = '2026-06-01'
        tripStore.endDate   = '2026-06-30'
        tripStore.homeStadiumId = 'NYY'（僅作為起點，不影響篩選範圍）
        tripStore.tripGenerationRequestId = 1（F-03 已觸發）
        games.json 已載入且包含 2,430 筆唯一賽事

When:   watcher 偵測到 tripGenerationRequestId 從 0 → 1

Then:   - 呼叫 loadGames() 取得全量 Game[]
        - filterByDateRange() 保留 date ∈ ['2026-06-01', '2026-06-30'] 的賽事
        - filterHomeOnly() 確認所有保留賽事的 homeTeamId 非空字串
        - deduplicateByGameId() 以 Map<gameId, Game> 去重，移除重複 gameId
        - sortByDate() 按 date ASC 排序（相同日期按 startTimeUtc ASC 排序）
        - filteredGames ref 更新為最終 Game[] 陣列
        - filterResult ref 更新（含 rawCount, filteredCount, duplicatesRemoved 統計）
        - isLoading = false, loadError = null
```

### Scenario 2: games.json 尚未存在 / 載入失敗

```
Given:  games.json 不存在於 src/assets/data/
        tripGenerationRequestId 從 0 → 1

When:   watcher 觸發，loadGames() 執行 dynamic import

Then:   - dynamic import 拋出 FETCH_FAILED 錯誤
        - filteredGames = []
        - loadError = 'FETCH_FAILED'
        - isLoading = false
        - filterResult = null
```

### Scenario 3: games.json 存在但 JSON 格式損毀

```
Given:  games.json 內容非合法 JSON 陣列（e.g., 單一物件、空字串）
        tripGenerationRequestId = 1

When:   loadGames() 執行 isGameArray() 型別守衛

Then:   - 若 Array.isArray(raw) === false → error: 'PARSE_ERROR'
        - 若 raw.length === 0 → error: 'EMPTY_DATA'
        - 若陣列第一個元素缺少必填欄位 → error: 'PARSE_ERROR'
        - filteredGames = [], isLoading = false
```

### Scenario 4: 日期區間內無賽事（空結果）

```
Given:  startDate = '2026-01-01', endDate = '2026-01-15'（休賽期）
        games.json 已正確載入，賽季從 2026-03-26 開始

When:   filterByDateRange() 執行

Then:   - filteredGames = []（空陣列，非錯誤狀態）
        - loadError = null
        - filterResult.filteredCount = 0
        - filterResult.rawCount = 2430（全量仍被計算）
```

### Scenario 5: 重複 gameId 去除（資料清洗）

```
Given:  games.json 因爬蟲腳本將同一場賽事寫入兩次（同一 gameId，相同欄位內容）

When:   deduplicateByGameId() 執行（使用 Map<string, Game>，後進者覆蓋前者）

Then:   - 最終陣列中該 gameId 只出現 1 次
        - filterResult.duplicatesRemoved = 1
        - DEV 環境輸出 console.warn（不影響 PROD 效能）
```

### Scenario 6: 初始狀態防止冷啟動觸發

```
Given:  應用程式剛啟動，tripGenerationRequestId = 0
        startDate = null, endDate = null

When:   watcher 初始化（immediate: false）

Then:   - NOT triggered（watcher 為 non-immediate）
        - filteredGames = []（初始狀態）
        - isLoading = false
```

### Scenario 7: 競態條件防護（連按兩次「產生行程」）

```
Given:  tripGenerationRequestId 在 500ms 內從 1 → 2（連續兩次 requestTripGeneration()）
        loadGames() 每次呼叫耗時 ~200ms

When:   第一次 watcher 觸發後仍在 async 執行中，第二次觸發到來

Then:   - 版本戳（requestId snapshot）機制：若 await 後 requestId 不等於當前值，丟棄舊結果
        - 最終僅第二次的結果寫入 filteredGames
        - 不出現 stale 資料覆蓋問題
```

---

## Technical Feasibility Assessment

| Concern | Finding | Mitigation |
|---|---|---|
| **Race Condition** | `tripGenerationRequestId` 可能快速連跳，兩個 async `loadGames()` 並發 | 版本戳 Pattern：`await` 後比對 `requestId !== tripGenerationRequestId.value`，不一致則 `return` |
| **Stale Games Cache** | `games.json` 為靜態資產，首次 dynamic import 後應快取 | `gameService.ts` module-level `let _cachedGames: Game[] \| null = null` |
| **Type Safety** | `games.json` 為外部靜態資料，runtime shape 可能與 `Game` interface 不符 | `isGameArray()` 型別守衛，驗證必填欄位型別 |
| **Prop Drilling** | `useGameFilter` 結果需傳遞到 F-05 | `useGameFilter` 直接讀 `tripStore`（Pinia），F-05 直接呼叫 composable，無 prop drilling |
| **Performance** | 2,430 筆 `Game[]` 的 filter + dedup + sort | `filter` + `Map` + `sort` 對此規模 < 5ms，不需 Web Worker |
| **Memory Leaks** | watcher 在 composable 生命週期結束後仍可能回調 | `stopWatcher()` + `isMounted` flag 在 `onBeforeUnmount` |
| **State Persistence** | 篩選結果是否需跨路由保留？ | 否，composable-local `ref`，每次觸發重新計算 |
| **homeTeamId 格式** | MLB 數值 teamId（`"147"`）vs 縮寫（`"NYY"`）必須統一 | 在 `gameService.ts` JSDoc 明確記載：使用數值格式，與 `Stadium.teamId` 一致 |

---

## Atomic Task Breakdown

### Phase 1: Type System & Data Contracts（型別系統與資料契約）

> **Why First**: 所有 Phase 的函式簽名與錯誤碼均依賴這些型別，先定義可讓 IDE 自動補全並在 compile 階段捕捉錯誤。

- [x] **1.1** 在 `src/types/models.ts` 新增 Game 篩選相關型別 ⏱ 45min
  - 新增 `GameLoadErrorCode`、`GameLoadResult`、`GameFilterOptions`、`FilteredGamesResult`
  - 驗收：`tsc --noEmit` 零錯誤；與 `StadiumLoadErrorCode` 結構一致

- [x] **1.2** 驗證現有 `Game` interface 欄位完整性 ⏱ 30min
  - 確認 `gameId`、`date`、`homeTeamId`、`awayTeamId`、`startTimeUtc` 均已定義
  - 驗收：書面確認 Game interface 足以支撐 F-04 所有純函式

---

### Phase 2: Service Layer（gameService.ts）

> **Why Second**: 純服務層（無響應式依賴），可獨立測試。

- [x] **2.1** 建立 `src/assets/data/games.json` 佔位檔 ⏱ 30min
  - 最小合法 `Game[]` 結構，含至少一筆測試資料
  - ⚠️ `homeTeamId` 使用 MLB 數值 teamId（如 `"147"` for NYY），與 `Stadium.teamId` 一致
  - 驗收：JSON 合法、`tsc` 可正確 import

- [x] **2.2** 實作 `src/services/gameService.ts` ⏱ 1h
  - module-level cache (`_cachedGames`)、`isGameArray()` 型別守衛、`_clearGameCache()` 測試輔助
  - 鏡像 `stadiumService.ts` 錯誤分類模式
  - JSDoc 記載 `homeTeamId` 格式約定（數值 teamId）
  - 驗收：快取命中路徑不重複 import

---

### Phase 3: Composable Logic（useGameFilter.ts）

> **Why Third**: 依賴 Phase 1 型別 + Phase 2 service；純函式先導出再被響應式層包裝。

- [x] **3.1** 實作純篩選函式（export，供測試） ⏱ 1h
  - `filterByDateRange`、`filterHomeOnly`、`deduplicateByGameId`、`sortByDate`、`applyGameFilters`
  - 所有函式有明確型別；無 `any`；`sortByDate` 不 mutate 輸入陣列
  - 驗收：純函式可在無 Vue 環境下單獨測試

- [x] **3.2** 實作響應式 `useGameFilter()` composable ⏱ 1.5h
  - watcher on `tripGenerationRequestId`（`immediate: false`）
  - 版本戳競態防護：`await` 後比對 `requestId !== tripGenerationRequestId.value`
  - `isMounted` flag + `stopWatcher()` 防止 memory leak
  - DEV 環境重複 gameId 輸出 `console.warn`
  - 驗收：連按兩次 requestTripGeneration() 時 filteredGames 只更新一次（最後一次）

---

### Phase 4: Store Integration（Store 整合驗證）

- [x] **4.1** 驗證 `tripStore` 現有 hook 足夠支撐 F-04 watcher ⏱ 30min
  - 確認 `tripGenerationRequestId` 初始值為 `0`（non-immediate watcher 不冷啟動觸發）
  - 確認 `requestTripGeneration()` 每次遞增 `+1`（重複觸發有效）
  - 驗收：書面確認無需修改 tripStore

- [ ] **4.2** ⚠️ 架構決策：`filteredGames` 狀態提升至 tripStore（方案 B，按需實作） ⏱ 45min
  - **方案 A（推薦，預設）**: `filteredGames` 保留在 composable local refs
  - **方案 B（若多元件需消費）**: 提升至 `tripStore`，新增 `setFilteredGames()`、`setGameLoadError()`
  - 驗收：架構決策有 PR comment 記錄

---

### Phase 5: Tests（單元測試）

- [x] **5.1** 純函式單元測試 `src/composables/__tests__/useGameFilter.spec.ts` ⏱ 1.5h
  - `filterByDateRange`：inclusive 左右邊界、空陣列、所有賽事在範圍外
  - `filterHomeOnly`：非空 homeTeamId 保留、空字串移除、空陣列
  - `deduplicateByGameId`：無重複、單重複、後進者覆蓋、空陣列
  - `sortByDate`：亂序 → ASC、同日期按 startTimeUtc、不 mutate 原陣列
  - `applyGameFilters`：整合管線 rawCount/filteredCount/duplicatesRemoved 正確
  - 驗收：全綠；純函式 coverage ≥ 100%

- [x] **5.2** Service 單元測試 `src/services/__tests__/gameService.spec.ts` ⏱ 1h
  - 成功路徑、EMPTY_DATA、PARSE_ERROR（非陣列）、PARSE_ERROR（缺欄位）
  - FETCH_FAILED（非 SyntaxError）、PARSE_ERROR（SyntaxError）
  - 快取命中：loadGames() 呼叫兩次，import() 只呼叫一次
  - 每次 test 前呼叫 `_clearGameCache()`
  - 驗收：全綠；所有 GameLoadErrorCode 分支覆蓋

- [x] **5.3** Composable 整合測試（整合部分） ⏱ 1.5h
  - 初始狀態：filteredGames = [], id=0 不觸發
  - 正常觸發：requestTripGeneration() 後 filteredGames 更新
  - 錯誤處理：FETCH_FAILED / EMPTY_DATA → loadError 正確設定
  - 缺少 store 狀態（null dates）→ 提前返回
  - 競態防護：連按兩次只更新最後一次結果
  - unmount 後不拋錯、不更新 refs
  - 驗收：全綠；無 Vue reactive warning

---

## Priority Matrix & Critical Path

### Priority Matrix

| 任務 | 優先級 | 理由 |
|---|---|---|
| 1.1 新增 Game 型別 | 🔴 CRITICAL | Block 所有 Phase |
| 1.2 驗證 Game interface | 🟡 MEDIUM | 可與 2.1 並行 |
| 2.1 建立 games.json 佔位檔 | 🔴 CRITICAL | gameService 編譯依賴 |
| 2.2 實作 gameService.ts | 🔴 CRITICAL | Block Phase 3 + 5.2 |
| 3.1 純篩選函式 | 🔴 CRITICAL | Block 3.2 + 5.1 |
| 3.2 useGameFilter composable | 🔴 CRITICAL | Block Phase 4 + 5.3 + F-05 |
| 4.1 驗證 tripStore hook | 🟡 MEDIUM | 可與 Phase 3 並行（review task） |
| 4.2 tripStore 延伸（方案 B） | 🟢 LOW | 僅在架構決策選方案 B 時實作 |
| 5.1 純函式測試 | 🟡 MEDIUM | 可與 3.2 並行（依賴 3.1） |
| 5.2 service 測試 | 🟡 MEDIUM | 依賴 2.2 |
| 5.3 composable 整合測試 | 🟡 MEDIUM | 依賴 3.2 |

### Effort Estimation

| Phase | 任務數 | 預估工時 |
|---|---|---|
| Phase 1: Types | 2 | 1h 15min |
| Phase 2: Service | 2 | 1h 30min |
| Phase 3: Composable | 2 | 2h 30min |
| Phase 4: Store Integration | 2 | 1h 15min |
| Phase 5: Tests | 3 | 4h |
| **Total** | **11** | **~10.5h** |

### Critical Path

```
Phase 1.1 (45min)
  ↓ blocks
Phase 2.1 (30min) ──→ [可同時進行 1.2 驗證]
  ↓ blocks
Phase 2.2 (1h)
  ↓ blocks
Phase 3.1 (1h) ──→ [可同時進行 5.2 service 測試]
  ↓ blocks
Phase 3.2 (1.5h) ──→ [可同時進行 5.1 純函式測試]
  ↓ blocks
Phase 4.1 (30min, review) ──→ [可同時進行 5.3 composable 測試]
  ↓
F-05 貪婪演算法可開始接線

Critical Path: 1.1 → 2.1 → 2.2 → 3.1 → 3.2 → 4.1 = ~5h 15min
```

### Overall Acceptance Criteria

- [ ] `tsc --noEmit` 零錯誤（strict mode）
- [ ] `vitest run` 全綠，無 `any` 型別洩漏
- [ ] `filterByDateRange` inclusive 邊界正確（含 startDate、含 endDate）
- [ ] `deduplicateByGameId` 以 `gameId` 為鍵，重複賽事只保留一筆
- [ ] `sortByDate` 不 mutate 原始陣列，同日期按 `startTimeUtc` 二次排序
- [ ] `loadGames()` 第二次呼叫命中快取（import 只執行一次）
- [ ] `useGameFilter` 在 `tripGenerationRequestId = 0` 時不觸發（避免冷啟動）
- [ ] 競態條件測試通過：連按兩次只更新最後一次結果
- [ ] unmount 後無 Vue reactive warning
- [ ] DEV 環境有重複 gameId 時輸出 `console.warn`（不影響 PROD）
- [ ] `homeTeamId` 格式約定在 `gameService.ts` JSDoc 中明確記載

### ⚠️ 架構決策提醒

1. **homeTeamId 格式**（最高風險）：`games.json` 的 `homeTeamId` 必須使用 MLB 數值 teamId（`"147"`），與 `Stadium.teamId` 一致，而非縮寫（`"NYY"`）。此映射關係影響 F-05 接線。
2. **方案 A vs B**：`filteredGames` 預設保留在 composable local refs（方案 A）。若地圖/時間軸元件也需消費，升級至方案 B（提升至 tripStore）。
3. **games.json 規模**：完整賽季 ~2,430 場，JSON ~800KB–1MB。Vite dynamic import 處理分割，module-level 快取確保後續請求 O(1)。
