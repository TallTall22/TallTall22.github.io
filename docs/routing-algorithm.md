# 排賽程演算法技術文件

> 適用版本：F-04 + F-05 實作  
> 最後更新：2026-04-12  
> 相關檔案：`src/utils/routingAlgorithm.ts`、`src/services/routingService.ts`、`src/composables/useRoutingAlgorithm.ts`、`src/composables/useGameFilter.ts`

---

## 目錄

1. [整體架構概覽](#1-整體架構概覽)
2. [資料流管線](#2-資料流管線)
3. [F-04：比賽篩選邏輯](#3-f-04比賽篩選邏輯)
4. [F-05：貪婪路徑演算法](#4-f-05貪婪路徑演算法)
5. [距離與交通時間計算](#5-距離與交通時間計算)
6. [候選球場評分機制](#6-候選球場評分機制)
7. [行程組裝與品質分數](#7-行程組裝與品質分數)
8. [錯誤碼一覽](#8-錯誤碼一覽)
9. [競態條件防護](#9-競態條件防護)
10. [型別系統速查](#10-型別系統速查)
11. [常數與調校參數](#11-常數與調校參數)
12. [已知限制與未來改善方向](#12-已知限制與未來改善方向)

---

## 1. 整體架構概覽

MLB Ballpark Tour Planner 的排程核心分為兩個獨立職責：

| 層次 | 職責 | 主要檔案 |
|------|------|---------|
| **篩選層** | 從原始賽事資料中取出符合日期範圍、去重、排序的清單 | `useGameFilter.ts` |
| **路徑層** | 以起點球場為基準，用貪婪演算法逐日決定當天最佳比賽 | `useRoutingAlgorithm.ts` → `routingService.ts` → `routingAlgorithm.ts` |

兩層之間**以 `filteredGames: Ref<Game[]>` 作為介面**，篩選完成後路徑層立即啟動，完全解耦。

---

## 2. 資料流管線

```
使用者操作（選球場 + 選日期 → 點「生成行程」）
       │
       ▼
tripStore.requestTripGeneration()
  └─ tripGenerationRequestId++ （版本戳記）
       │
       ▼
useGameFilter（watch tripGenerationRequestId）
  1. loadGames()              ← 從 assets/data/games.json 載入（有 module-level cache）
  2. filterValidHomeGames()   ← 移除 homeTeamId 為空的髒資料
  3. filterByDateRange()      ← 只保留 [startDate, endDate] 區間
  4. deduplicateByGameId()    ← 以 gameId 去重（last-writer wins）
  5. sortByDate()             ← 按日期 ASC 排序，同日依開賽時間 ASC
       │
       ▼ filteredGames（新 array reference 觸發 watch）
       │
       ▼
useRoutingAlgorithm（watch filteredGames）
  └─ computeTrip()（routingService）
       1. loadStadiums()          ← 從 assets/data/stadiums.json 載入（有 cache）
       2. buildStadiumByIdMap()   ← 建立 Stadium.id → Stadium 查詢表
       3. buildStadiumByTeamIdMap() ← 建立 Stadium.teamId → Stadium 查詢表
       4. buildItinerary()        ← 貪婪路徑演算法主體
       5. assembleTripFromItinerary() ← 組裝成 Trip 物件
       │
       ▼
tripStore.setSelectedTrip(trip)
  └─ App.vue watch → 自動切換至「路線地圖」Tab
```

---

## 3. F-04：比賽篩選邏輯

篩選管線由四個**純函式**串接，每一步都回傳新陣列（不修改輸入），方便單元測試。

### 3.1 有效主場賽事篩選

```typescript
function filterValidHomeGames(games: Game[]): Game[]
```

- 移除 `homeTeamId` 為空字串或非字串的紀錄
- 這些髒資料若流入路徑層，`haversineDistance` 會因找不到座標而算出 NaN

### 3.2 日期範圍篩選

```typescript
function filterByDateRange(games: Game[], options: GameFilterOptions): Game[]
```

- 利用 `ISODateString`（`"YYYY-MM-DD"`）的**字串字典序 = 時間序**特性
- `g.date >= startDate && g.date <= endDate`：兩端皆為閉區間（inclusive）
- 不使用 `Date` 物件，避免時區轉換造成邊界差一天的問題

### 3.3 去重

```typescript
function deduplicateByGameId(games: Game[]): { unique: Game[]; duplicatesRemoved: number }
```

- 以 `Map<gameId, Game>` 實作 **last-writer wins**
- 若上游資料源有重複 `gameId`，開發環境會印出警告
- 回傳 `duplicatesRemoved` 供 debug 用途

### 3.4 排序

```typescript
function sortByDate(games: Game[]): Game[]
```

- 主鍵：`date` 字串 ASC（`localeCompare`）
- 次鍵：`startTimeUtc` ASC（同一天的賽事依開賽時間排序）
- 使用展開運算子 `[...games].sort()` 確保不修改原陣列

---

## 4. F-05：貪婪路徑演算法

### 4.1 演算法概念

這是一個**每日貪婪（Daily Greedy）**演算法：逐日掃描旅行期間，每一天都選擇**距離當前位置最近的主場比賽**作為當天目的地。

- **不保證全域最優解**（非動態規劃）
- 優點：時間複雜度低（O(D × G)），使用者感知延遲小
- 適用情境：MLB 球場分布跨越北美大陸，相鄰天數之間的貪婪選擇通常接近人類直覺

### 4.2 核心流程（逐步說明）

```
初始化：
  currentStadium ← homeStadium（使用者選定的起點球場）
  dayNumber ← 1
  gamesByDate ← Map<ISODateString, Game[]>（O(1) 查詢）

對 [startDate, endDate] 內的每一天 cursor：
  gamesOnDay ← gamesByDate.get(cursor)

  若 gamesOnDay 為空：
    → 插入 TravelDay（休息/移動日，保留 currentStadium 不變）

  若 gamesOnDay 非空：
    → 對每場比賽計算 score（距離 currentStadium 的距離分數）
    → 選出 score 最高（距離最近）的比賽 best
    → 更新 currentStadium ← best.stadium
    → 插入 GameDay（記錄比賽、距離、預估旅行時間）

  dayNumber++
```

### 4.3 `TravelDay` 的語意

`TravelDay` 不只代表「沒有比賽」，也兼具「移動到下一個目的地」的語意。當天的 `stadiumId` 記錄的是**旅行者當天所在的球場城市**（即前一個 `GameDay` 的目的地），方便前端繪製行程表。

### 4.4 邊界情況處理

| 情況 | 處理方式 |
|------|---------|
| 當天所有比賽的 `homeTeamId` 都無法對應到已知球場 | 降級為 `TravelDay` |
| 起點球場與目的地球場相同（同城市連續主場賽） | `distanceFromPrevious = 0`，`estimatedTravelTime = 0` |
| 旅行期間完全沒有比賽（空 `filteredGames`） | `routingService` 在進入演算法前提前回傳 `NO_GAMES` 錯誤 |

---

## 5. 距離與交通時間計算

### 5.1 Haversine 公式

```typescript
function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number
```

計算地球表面兩點之間的**大圓距離**（單位：公里）。

公式推導：

```
dLat  = toRadians(b.lat - a.lat)
dLng  = toRadians(b.lng - a.lng)
chord = sin²(dLat/2) + cos(a.lat) × cos(b.lat) × sin²(dLng/2)
dist  = 2 × R × arcsin(√chord)     // R = 6,371 km
```

- 精確度：對 MLB 的使用情境（最遠不超過 5,000 km）誤差 < 0.5%
- 不考慮地形、實際道路距離

### 5.2 交通時間預估

```typescript
function estimateTravelMinutes(distanceKm: number): number
```

| 距離區間 | 交通方式 | 計算公式 |
|---------|---------|---------|
| < 1 km | 步行/免旅行 | 0 分鐘 |
| 1 ~ 200 km | 開車（`DRIVE_MAX_KM`） | `(km ÷ 100 km/h) × 60` |
| > 200 km | 搭機 | `(km ÷ 800 km/h) × 60 + 120 分鐘` |

> **120 分鐘航空附加時間（`FLIGHT_OVERHEAD_MIN`）**：涵蓋辦理登機手續、安檢、候機、下機出關等流程的估算值。

---

## 6. 候選球場評分機制

```typescript
function scoreGameCandidates(
  games: Game[],
  currentStadium: Stadium,
  byTeamId: Map<string, Stadium>,
): ScoredCandidate[]
```

每個候選比賽的分數計算：

```
score = max(0, MAX_REACH_KM - distanceKm)
      = max(0, 5000 - distanceKm)
```

- `MAX_REACH_KM = 5,000 km`：北美任意兩個 MLB 球場的最大距離上限
- **score 越高 = 距離越近 = 優先選擇**
- score = 0 代表距離 ≥ 5,000 km（理論上不會發生於 CONUS + 多倫多的賽程中）
- 找不到 `homeTeamId` 對應球場的比賽**靜默丟棄**（資料完整性防護）

選擇邏輯：

```typescript
const best = candidates.reduce((a, b) => (a.score > b.score ? a : b));
```

當多場比賽 score 相同（距離相等）時，`reduce` 保留**先出現者**（即日期排序中較早的賽程，符合人類直覺）。

---

## 7. 行程組裝與品質分數

```typescript
function assembleTripFromItinerary(
  itinerary: TripDay[],
  options: RoutingOptions,
): Trip
```

### 7.1 `Trip` 物件欄位

| 欄位 | 說明 |
|------|------|
| `tripId` | `crypto.randomUUID()` 生成的唯一識別碼 |
| `createdAt` | 建立日期（本地日期，非 UTC） |
| `totalDistance` | 所有 `GameDay.distanceFromPrevious` 的總和（公里） |
| `qualityScore` | `Math.round((gameDays / totalDays) × 100)` |

### 7.2 品質分數（qualityScore）

品質分數代表「旅行期間有多少天實際看了比賽」的百分比：

```
qualityScore = round( 有比賽的天數 / 總天數 × 100 )
```

- 100 分：每天都有比賽（密集行程）
- 0 分：完全沒有比賽（不可能通過 `NO_GAMES` 守衛）
- 典型行程：50–80 分（MLB 球季每天約有 10–15 場比賽，但覆蓋率因城市集中度而異）

---

## 8. 錯誤碼一覽

### F-04 篩選層

| 錯誤碼 | 觸發時機 |
|--------|---------|
| `FETCH_FAILED` | `games.json` 動態 import 失敗（網路或 bundle 錯誤） |
| `PARSE_ERROR` | JSON 格式不符合 `Game[]` 結構 |
| `EMPTY_DATA` | 陣列為空（資料源問題） |

### F-05 路徑層

| 錯誤碼 | 觸發時機 | 使用者訊息 |
|--------|---------|-----------|
| `NO_GAMES` | `filteredGames` 為空，或演算法跑完後無任何 `GameDay` | 選定期間內找不到可用的比賽，請調整日期範圍 |
| `NO_HOME_STADIUM` | `homeStadiumId` 無法在球場資料中找到對應紀錄 | 起點球場設定無效，請重新選擇 |
| `STADIUM_LOAD_FAILED` | `loadStadiums()` 回傳錯誤 | 球場資料載入失敗，請重新整理頁面 |
| `EMPTY_ITINERARY` | `buildItinerary` 回傳空陣列（正常輸入下不應發生） | 無法生成行程，請縮短旅程天數後再試 |

---

## 9. 競態條件防護

本系統有兩個非同步管線，各自使用**版本戳記（version stamp）**防止舊請求覆蓋新結果。

### 9.1 useGameFilter — 使用 `tripGenerationRequestId`

```typescript
// tripStore 的計數器，每次 requestTripGeneration() 呼叫時遞增
watch(tripGenerationRequestId, (newId) => {
  void runFilter(newId);
});

// 在 async 函式中比較版本
if (!isMounted || requestId !== tripGenerationRequestId.value) return;
```

### 9.2 useRoutingAlgorithm — 使用私有計數器

```typescript
let requestCounter = 0;

watch(filteredGames, () => {
  requestCounter++;
  void runRouting(requestCounter);
});

// 在 async 函式中比較版本
if (!isMounted || requestId !== requestCounter) return;
```

**為何路徑層不複用 `tripGenerationRequestId`？**

篩選層的觸發點是 `tripGenerationRequestId`（使用者明確要求），路徑層的觸發點是 `filteredGames`（篩選完成後自動觸發）。若兩者共用同一個計數器，在篩選結果快速連續寫入時（例如快取命中），版本比較可能誤判。使用私有計數器可確保每個層次只管理自己的並發狀態。

### 9.3 `isMounted` 旗標

所有 composable 都在 `onBeforeUnmount` 中設置 `isMounted = false`，確保元件被銷毀後的非同步回呼不會嘗試寫入已被清理的響應式狀態。

---

## 10. 型別系統速查

```
ISODateString          "YYYY-MM-DD" 字串別名，強調格式約束

Game                   一場比賽（gameId, date, homeTeamId, venue...）
Stadium                一個球場（id, teamId, coordinates, league...）

TripDayBase            dayNumber, date, distanceFromPrevious?, estimatedTravelTime?
  ├─ GameDay           type:'game_day' + stadiumId + game（有看比賽的天）
  └─ TravelDay         type:'travel_day' + stadiumId?（移動/休息日）
TripDay                = GameDay | TravelDay（判別聯合型別）

ScoredCandidate        { game, stadium, distanceKm, score }（評分中間結果）
RoutingOptions         { startDate, endDate, homeStadiumId }（演算法輸入）
RoutingResult          { trip, error, totalGamesAttended, totalTravelDays }
Trip                   完整行程物件（tripId, itinerary, totalDistance, qualityScore...）
```

---

## 11. 常數與調校參數

以下常數定義於 `src/utils/routingAlgorithm.ts`，調整時需同步更新相關單元測試。

| 常數 | 預設值 | 說明 |
|------|--------|------|
| `EARTH_RADIUS_KM` | 6,371 km | 地球平均半徑（Haversine 用） |
| `MAX_REACH_KM` | 5,000 km | 評分上限；CONUS + 多倫多任意兩球場距離上限 |
| `DRIVE_MAX_KM` | 200 km | 低於此距離視為開車比飛機快 |
| `DRIVE_SPEED_KMH` | 100 km/h | 公路行駛平均速度 |
| `FLIGHT_SPEED_KMH` | 800 km/h | 民航機平均巡航速度 |
| `FLIGHT_OVERHEAD_MIN` | 120 分鐘 | 搭機附加時間（辦票 + 安檢 + 下機） |

---

## 12. 已知限制與未來改善方向

### 目前限制

| 限制 | 影響 |
|------|------|
| 每天只選一場比賽 | 同一天有複數球場可選時，無法考慮次日的最佳跳板位置 |
| 不考慮票價與時區 | 飛行距離遠不代表旅行成本高；東西岸時差也未納入考量 |
| 假設每天都能移動 | 未考慮連續多天球場完售、旅行者只能在同城停留等限制 |
| 固定平均速度 | 實際開車時間受交通狀況影響，飛行時間受航線影響 |
| 非全域最優 | 貪婪選擇可能在行程後期導致繞路（例如早期選了遠方球場，錯過中間更優的路徑） |

### 潛在改善方向

1. **Look-ahead 貪婪**：評分時考慮次日甚至後 N 天的賽程，選出「最佳跳板」而非單純最近
2. **動態規劃**：對旅行天數 ≤ 30 天的短行程，可以用 DP 求全域最優解
3. **使用者偏好權重**：允許調整「偏好特定球隊」或「偏好最少交通時間」等權重參數
4. **實際飛行時間 API**：整合航班資料取代簡化的物理公式
5. **品質分數細化**：目前純粹看「有比賽的天數佔比」，可加入「球場多樣性」（不重複參觀同一球場）等維度
