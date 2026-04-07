# 📋 MLB Ballpark Tour Planner (MVP 版)

---

## 1️⃣ 專案概述 (Project Overview)

本專案旨在開發一個**純前端的單頁應用程式 (SPA)**，協助棒球迷規劃美國職棒大聯盟 (MLB) 30 座球場的巡迴行程。

**核心價值**：使用者可透過直覺的操作介面選擇日期區間，系統將根據預載的賽程與地理資料，自動生成一條視覺化的可行旅遊路線。

| 項目       | 內容                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| 目標受眾   | MLB 球迷、運動旅遊愛好者                                                                                |
| 專案性質   | 前端工程師求職展示用 (Side Project)                                                                     |
| **技術棧** | **Vue 3 (Composition API)**、**TypeScript**、**Vuetify 3**、**Pinia**、**Google Maps API** (或 Leaflet) |

---

## 2️⃣ 系統範圍 (System Scope)

為確保專案能在合理時間內獨立完成，MVP (最小可行性產品) 階段將採取以下限制：

### 架構限制

- **純前端架構**：不開發後端伺服器，賽程資料與球場座標將整理為靜態 JSON 檔案 (.json) 供前端讀取
- **演算簡化**：採用「**貪婪演算法 (Greedy Algorithm)**」概念，以「當前所在球場的鄰近有比賽球場」為優先推薦，不追求全局最佳解 (Global Optimum)
- **固定賽季**：以單一賽季（2026）的常規賽賽程為基礎

---

## 3️⃣ 使用者介面結構 (UI/UX Structure)

應用程式採用**左右分區或上下分層的響應式設計 (RWD)**：

### 主要区域

| 区域                         | 描述                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| **控制面板** (Control Panel) | 側邊欄或頂部，包含日期選擇器、行程產生按鈕、已規劃行程的時間軸 (Timeline) |
| **視覺化地圖** (Map View)    | 主視覺區，滿版顯示地圖，標記球場位置與移動軌跡                            |

---

## 4️⃣ 功能需求 (Functional Requirements)

### 4.1 日期與起點設定 (Input Configuration)

#### F-01: 日期區間選擇

- **優先級**: 🔴 HIGH
- **依賴**: 無
- **子任務**:
  - F-01.1: 建立日期選擇元件（開始日期選擇器）
  - F-01.2: 建立日期選擇元件（結束日期選擇器）
  - F-01.3: 實現日期驗證邏輯（最大 180 天、不能選過去日期）
  - F-01.4: 實現日期選擇變更事件處理

#### F-02: 起點設定 (Home Stadium Selection)

- **優先級**: 🔴 HIGH
- **依賴**: 資料模型（stadiums.json）
- **子任務**:
  - F-02.1: 加載 30 支球隊資料
  - F-02.2: 建立球隊選擇下拉清單元件
  - F-02.3: 實現搜尋過濾功能
  - F-02.4: 顯示球隊標誌和球場縮圖

#### F-03: 一鍵推薦 (Quick Start Presets)

- **優先級**: 🟡 MEDIUM
- **依賴**: F-01, F-02
- **子任務**:
  - F-03.1: 定義預設行程方案（加州、美東、美中等）
  - F-03.2: 建立快速按鈕群組
  - F-03.3: 實現一鍵填入邏輯
  - F-03.4: 自動觸發行程生成

### 4.2 行程生成邏輯 (Routing Logic)

#### F-04: 賽事篩選 (Game Filtering)

- **優先級**: 🔴 HIGH
- **依賴**: F-01, 資料模型（games.json）
- **子任務**:
  - F-04.1: 按日期區間篩選賽事
  - F-04.2: 僅保留主場賽事
  - F-04.3: 移除重複賽事
  - F-04.4: 按日期排序結果

#### F-05: 可行性推薦演算 (Routing Algorithm)

- **優先級**: 🔴 HIGH
- **依賴**: F-04
- **子任務**:
  - F-05.1: 實現 Haversine 距離計算函式
  - F-05.2: 建立候選球場評分系統（距離 + 時間間隔）
  - F-05.3: 實現貪婪演算法核心邏輯
  - F-05.4: 新增移動日標記邏輯
  - F-05.5: 時區計算和轉換（比賽時間本地化）
  - F-05.6: 實現行程可行性驗證（連續天數等）

### 4.3 資訊視覺化 (Data Visualization)

#### F-06: 動態地圖連線 (Map Polylines)

- **優先級**: 🟡 MEDIUM
- **依賴**: F-05, Google Maps 初始化
- **子任務**:
  - F-06.1: 整合 Google Maps / Leaflet API
  - F-06.2: 實現多點折線連結
  - F-06.3: 添加方向箭頭標記
  - F-06.4: 實現連線彩色編碼（移動日 vs 比賽日）
  - F-06.5: 優化地圖邊界自動調整

#### F-07: 互動式標記 (Interactive Markers)

- **優先級**: 🟡 MEDIUM
- **依賴**: F-06
- **子任務**:
  - F-07.1: 為所有球場添加地圖標記
  - F-07.2: 區分「已排入」vs「未排入」標記樣式
  - F-07.3: 實現標記點擊事件（顯示 InfoWindow）
  - F-07.4: 設計 InfoWindow 資訊卡（球隊名、球場名、照片）
  - F-07.5: 實現標記懸停提示 (Tooltip)

#### F-08: 行程時間軸 (Timeline Component)

- **優先級**: 🟡 MEDIUM
- **依賴**: F-05
- **子任務**:
  - F-08.1: 設計時間軸元件結構
  - F-08.2: 按日期呈現行程卡片
  - F-08.3: 顯示對戰組合格式 (客隊 @ 主隊)
  - F-08.4: 顯示當地時間和時區標記
  - F-08.5: 實現水平或垂直捲動

#### F-09: 聯動高亮 (Cross-Highlight Interaction)

- **優先級**: 🟢 LOW
- **依賴**: F-07, F-08
- **子任務**:
  - F-09.1: 實現時間軸項目懸停偵測
  - F-09.2: 實現地圖標記高亮動畫
  - F-09.3: 實現連線高亮動畫
  - F-09.4: 反向聯動（地圖標記懸停時高亮時間軸）

### 4.4 使用者互動與回饋 (User Feedback)

#### F-10: 行程重置和編輯

- **優先級**: 🟡 MEDIUM
- **依賴**: F-01 ~ F-09
- **子任務**:
  - F-10.1: 「重新開始」按鈕
  - F-10.2: 「導出行程」(JSON/PDF)
  - F-10.3: 「分享行程」(URL 編碼)

#### F-11: 載入狀態管理

- **優先級**: 🟡 MEDIUM
- **依賴**: 全局
- **子任務**:
  - F-11.1: 骨架屏設計（地圖、時間軸）
  - F-11.2: 資料載入進度提示
  - F-11.3: 錯誤狀態提示和重試機制

---

## 5️⃣ 非功能需求 (Non-Functional Requirements)

### 型別安全 (Type Safety)

- **優先級**: 🔴 HIGH
- **子任務**:
  - T-01.1: 配置 TypeScript 嚴格模式 (`strict: true`)
  - T-01.2: 為所有資料模型定義介面
  - T-01.3: 為元件 props 和 emits 定義型別
  - T-01.4: 建立全局型別定義檔 (`types/index.ts`)

### 狀態管理 (State Management)

- **優先級**: 🔴 HIGH
- **子任務**:
  - S-01.1: 建立 Pinia store（trip store）
  - S-01.2: 建立 Pinia store（map store）
  - S-01.3: 建立 Pinia store（ui store - 選單狀態等）
  - S-01.4: 實現跨元件狀態同步
  - S-01.5: 實現狀態持久化（LocalStorage）

### 效能 (Performance)

- **優先級**: 🔴 HIGH
- **子任務**:
  - P-01.1: 非同步加載 JSON 資料檔
  - P-01.2: 實現骨架屏載入畫面
  - P-01.3: 延遲載入地圖（Lazy Loading）
  - P-01.4: 優化算法時間複雜度（最多 O(n²)）
  - P-01.5: 實現資料快取機制

### 響應式設計 (RWD)

- **優先級**: 🟡 MEDIUM
- **子任務**:
  - R-01.1: 定義斷點（mobile, tablet, desktop）
  - R-01.2: 實現側邊欄抽屜（mobile 版）
  - R-01.3: 實現地圖全屏/分屏切換
  - R-01.4: 測試各斷點下的可用性

---

## 🎨 Design System (MLB Official Style)

### 色彩系統 (Color System)

基於 MLB 官方配色方案設計

#### 主色調

| 用途              | HEX       | RGB            | 說明                 |
| ----------------- | --------- | -------------- | -------------------- |
| **Primary Brand** | `#002D72` | (0, 45, 114)   | MLB 藍 - 主要品牌色  |
| **Secondary**     | `#FFD700` | (255, 215, 0)  | 棒球金色 - 強調色    |
| **Success**       | `#10A947` | (16, 169, 71)  | 綠色 - 確認/成功狀態 |
| **Warning**       | `#FF6B35` | (255, 107, 53) | 橘色 - 警告/重點     |
| **Error**         | `#D32F2E` | (211, 47, 46)  | 紅色 - 錯誤          |

#### 中性色

| 用途               | HEX       | 說明     |
| ------------------ | --------- | -------- |
| **Background**     | `#FFFFFF` | 頁面背景 |
| **Surface**        | `#F5F5F5` | 次要表面 |
| **Border**         | `#DDDDDD` | 邊框色   |
| **Text Primary**   | `#212121` | 主要文字 |
| **Text Secondary** | `#757575` | 次要文字 |

### 排版系統 (Typography)

#### 字體家族

- **標題字體**: `'MLB Display', -apple-system, BlinkMacSystemFont, 'Segoe UI'` (或 Google Fonts: Roboto Bold)
- **內文字體**: `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI'`
- **等寬字體**: `'Roboto Mono'` (用於時間、程式碼)

#### 尺寸階級

| 名稱           | 尺寸       | 行高  | 字重 | 用途       |
| -------------- | ---------- | ----- | ---- | ---------- |
| **H1**         | `2.5rem`   | `1.2` | 700  | 頁面標題   |
| **H2**         | `2rem`     | `1.3` | 700  | 大區塊標題 |
| **H3**         | `1.5rem`   | `1.4` | 600  | 小區塊標題 |
| **Body Large** | `1.1rem`   | `1.5` | 400  | 主要內文   |
| **Body**       | `1rem`     | `1.5` | 400  | 標準內文   |
| **Body Small** | `0.875rem` | `1.4` | 400  | 輔助文字   |
| **Caption**    | `0.75rem`  | `1.3` | 500  | 附註/說明  |

### 間距系統 (Spacing Scale)

使用 8px 基數系統

```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### 圓角系統 (Border Radius)

| 類型      | 值       | 用途           |
| --------- | -------- | -------------- |
| **Sharp** | `0px`    | 按鈕邊框       |
| **sm**    | `4px`    | 卡片、輸入框   |
| **md**    | `8px`    | 模態框、標記   |
| **lg**    | `12px`   | 主要卡片       |
| **full**  | `9999px` | 圓形標記、頭像 |

### 陰影系統 (Elevation/Shadows)

| 等級            | 值                                | 用途     |
| --------------- | --------------------------------- | -------- |
| **Elevation 0** | `none`                            | 平面元素 |
| **Elevation 1** | `0 2px 4px rgba(0, 0, 0, 0.1)`    | 微提升   |
| **Elevation 2** | `0 4px 8px rgba(0, 0, 0, 0.12)`   | 卡片     |
| **Elevation 3** | `0 8px 16px rgba(0, 0, 0, 0.15)`  | 模態框   |
| **Elevation 4** | `0 12px 24px rgba(0, 0, 0, 0.18)` | 浮動按鈕 |

### 元件庫 (Component Library)

#### 按鈕變體

- **Primary**: 藍色底、白色文字、圓角 md
- **Secondary**: 邊框藍色、藍色文字
- **Success**: 綠色底
- **Danger**: 紅色底
- **Outlined**: 透明底、邊框
- **Ghost**: 無邊框、懸停時變色

#### 輸入元件

- **Date Picker**: 日曆彈窗、選擇日期範圍高亮
- **Select Dropdown**: 可搜尋、顯示縮圖
- **Text Input**: 佔位符、清除按鈕
- **Slider**: 日期範圍滑塊

#### 卡片 (Card)

- **Game Card**: 比賽卡片（時間 + 隊名 + 分數 - MVP 時尚式）
- **Stadium Card**: 球場卡片（球場照片 + 資訊）
- **Info Card**: 懸停資訊卡

#### 地圖相關

- **Marker Styles**:
  - 🔵 已排入球場 (藍色)
  - ⚪ 未排入球場 (灰色)
  - 🎯 起點球場 (祥瑞金)
- **Polyline Styles**:
  - ━━ 比賽日連線 (藍色, 寬度 3px)
  - ╌╌ 移動日連線 (虛線, 寬度 2px)

#### 動畫規範

- **Hover States**: `transition: all 0.2s ease`
- **Loading Animation**: 脈衝動畫 (`opacity: 0.8 -> 1`)
- **Highlight Animation**: 發光效果 (`box-shadow: 0 0 12px rgba(0, 45, 114, 0.5)`)
- **Cross-highlight**: 平滑過渡 + 微妙放大 (scale: 1 -> 1.05)

### 圖標系統 (Icon System)

| 圖標 | 用途          |
| ---- | ------------- |
| 🗓️   | 日期選擇      |
| 📍   | 位置/地圖標記 |
| 🎯   | 起點/目標     |
| ✈️   | 移動日        |
| 📋   | 行程列表      |
| 🔄   | 重新開始      |
| 📤   | 導出/分享     |
| ⚾   | 比賽/棒球狀態 |

---

## 6️⃣ 資料規格定義 (Data Models)

### 球場基本資訊 (stadiums.json)

```typescript
export interface Stadium {
  id: string; // 唯一碼，如 'NYY'
  teamId: string; // 球隊 ID
  teamName: string; // 球隊名稱，如 'New York Yankees'
  teamNickname: string; // 暱稱，如 'Yankees'
  stadiumName: string; // 球場名稱，如 'Yankee Stadium'
  city: string; // 所在城市
  state: string; // 州別碼（如 'NY'）
  coordinates: {
    lat: number; // 緯度
    lng: number; // 經度
  };
  timeZone: string; // 時區，如 'America/New_York'
  league: 'AL' | 'NL'; // 美聯/國聯
  division: 'ALE' | 'ALW' | 'ALC' | 'NLE' | 'NLW' | 'NLC'; // 分區
  logoUrl: string; // 隊徽 URL
  stadiumPhotoUrl: string; // 球場照片 URL
  officialsWebsite?: string; // 球季官網
}
```

### 賽事資訊 (games.json)

```typescript
export interface Game {
  gameId: string; // 唯一遊戲碼
  date: string; // 比賽日期 (YYYY-MM-DD)
  dayOfWeek: string; // 星期（Mon, Tue...）
  homeTeamId: string; // 主場球隊 ID (對應 Stadium.id)
  awayTeamId: string; // 客場球隊 ID
  startTimeLocal: string; // 當地開賽時間 (HH:mm)
  startTimeUtc: string; // UTC 時間（用於排序）
  venue: string; // 球場名稱
  series?: {
    // 系列賽資訊
    seriesId: string;
    gameNumber: number; // 這是系列賽第幾場
    maxGames: number; // 系列賽最多場數
  };
}
```

### 行程資訊 (Trip Model)

```typescript
export interface Trip {
  tripId: string; // 行程唯一碼
  createdAt: string; // 建立時間
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  homeStadiumId: string; // 起點球場 ID
  itinerary: TripDay[]; // 逐日行程
  totalDistance: number; // 總移動距離（公里）
  qualityScore: number; // 行程品質評分 (0-100)
}

export interface TripDay {
  dayNumber: number; // 第幾天
  date: string; // YYYY-MM-DD
  type: 'game_day' | 'travel_day'; // 比賽日或移動日
  stadiumId?: string; // 所在球場 ID
  game?: Game; // 該天比賽資訊
  distanceFromPrevious?: number; // 從前一球場的距離
  estimatedTravelTime?: number; // 预计行程时间（小时）
}
```

### UI 狀態模型 (UiState)

```typescript
export interface UiState {
  isLoading: boolean; // 全局加載狀態
  error?: string; // 錯誤訊息
  selectedTrip: Trip | null; // 當前選定行程
  mapCenter: {
    lat: number;
    lng: number;
  };
  mapZoom: number;
  highlightedDay?: number; // 懸停的時間軸日期
  isSidebarOpen: boolean; // 側邊欄狀態（mobile）
  viewMode: 'map' | 'timeline' | 'split'; // 檢視模式
}
```

---

## 7️⃣ 資料夾結構和檔案規劃

### 項目檔案結構

```
src/
├── components/
│   ├── common/
│   │   ├── Button.vue
│   │   ├── Card.vue
│   │   ├── Input.vue
│   │   └── Skeleton.vue
│   ├── map/
│   │   ├── MapContainer.vue
│   │   ├── MapMarker.vue
│   │   ├── MapPolyline.vue
│   │   └── MapInfoWindow.vue
│   ├── timeline/
│   │   ├── TimelineContainer.vue
│   │   ├── TimelineDay.vue
│   │   └── TimelineCard.vue
│   ├── control-panel/
│   │   ├── DateRangePicker.vue
│   │   ├── StadiumSelector.vue
│   │   ├── QuickStartButtons.vue
│   │   └── ControlPanel.vue
│   └── layout/
│       ├── Header.vue
│       ├── Sidebar.vue
│       └── MainLayout.vue
├── views/
│   └── HomeView.vue             // 主頁面視圖（路由入口）
├── composables/
│   ├── useTrip.ts               // 行程生成邏輯
│   ├── useMap.ts                // 地圖互動邏輯
│   └── useDataLoader.ts         // 資料非同步加載
├── stores/
│   ├── tripStore.ts             // 行程狀態
│   ├── mapStore.ts              // 地圖狀態
│   └── uiStore.ts               // UI 狀態
├── services/
│   ├── dataService.ts           // 資料加載
│   ├── routingEngine.ts         // 行程生成演算
│   ├── geoService.ts            // 地理計算
│   └── api.ts                   // (Phase 2 預留) 外部 API 端點
├── types/
│   ├── index.ts                 // 全局型別
│   ├── models.ts                // 資料模型
│   └── components.ts            // 元件型別
├── utils/
│   ├── distance.ts              // Haversine 計算
│   ├── timeZone.ts              // 時區轉換
│   └── formatters.ts            // 格式化工具
├── assets/
│   ├── data/
│   │   ├── stadiums.json        // 球場資料
│   │   ├── games-2026.json      // 2026 賽程
│   │   └── presets.json         // 快速推薦預設
│   ├── styles/
│   │   ├── variables.css        // CSS 變數（色彩、間距等）
│   │   ├── global.css           // 全局樣式
│   │   └── animations.css       // 動畫定義
│   └── icons/                   # SVG 圖標
├── App.vue
└── main.ts

public/
├── images/                      # 球隊/球場照片
├── index.html
└── favicon.ico
```

---

## 8️⃣ 實現路線圖 (Implementation Roadmap)

### 第一階段：基礎架構 (Week 1)

| 任務 | 程序       | 說明                                   |
| ---- | ---------- | -------------------------------------- |
| 1    | _環境設置_ | 初始化 Vue 3 + TS 項目、Pinia、Vite    |
| 2    | _型別定義_ | 建立所有 TS 介面 (`types/`)            |
| 3    | _CSS 系統_ | 建立設計系統 CSS 變數和全局樣式        |
| 4    | _資料載入_ | 實現非同步 JSON 載入，建立 dataService |
| 5    | _基本元件_ | Button, Card, Input, Skeleton 元件     |

### 第二階段：核心功能 (Week 2)

| 任務 | 程序         | 說明                                    |
| ---- | ------------ | --------------------------------------- |
| 6    | _日期選擇器_ | 實現 F-01 日期選擇                      |
| 7    | _球場選擇_   | 實現 F-02 球場選擇下拉選單              |
| 8    | _快速推薦_   | 實現 F-03 快速推薦按鈕                  |
| 9    | _賽事篩選_   | 實現 F-04 賽事篩選邏輯                  |
| 10   | _核心算法_   | 實現 F-05 貪婪演算法 + Haversine + 時區 |

### 第三階段：地圖與視覺化 (Week 3)

| 任務 | 程序       | 說明                       |
| ---- | ---------- | -------------------------- |
| 11   | _地圖集成_ | 整合 Google Maps / Leaflet |
| 12   | _地圖標記_ | 實現 F-07 互動式標記       |
| 13   | _地圖連線_ | 實現 F-06 動態連線和箭頭   |
| 14   | _時間軸_   | 實現 F-08 時間軸元件       |
| 15   | _聯動高亮_ | 實現 F-09 交互高亮效果     |

### 第四階段：優化與打磨 (Week 4)

| 任務 | 程序         | 說明                         |
| ---- | ------------ | ---------------------------- |
| 16   | _響應式設計_ | 實現 RWD（手機、平板、桌面） |
| 17   | _載入狀態_   | 骨架屏、進度提示             |
| 18   | _行程操作_   | 導出、分享、重置功能 (F-10)  |
| 19   | _效能優化_   | 懶加載、快取、演算時間優化   |
| 20   | _生產構建_   | 測試、除錯、部署準備         |

---

## 9️⃣ 技術檢查清單 (Technical Checklist)

### 開發環境

- [ ] Node.js >= 18.x 已安裝
- [ ] npm 已配置
- [ ] VS Code + Volar 擴充已安裝
- [ ] Git 與 GitHub 連接

### 專案配置

- [ ] `tsconfig.json` 設置 `strict: true`
- [ ] Vite 配置最佳化
- [ ] ESLint 規則已配置
- [ ] Prettier 格式化已配置

### 資料準備

- [ ] `stadiums.json` 包含 30 支球隊資料（含座標、時區）
- [ ] `games-2026.json` 包含完整 2026 賽程
- [ ] `presets.json` 包含至少 3 個快速推薦方案
- [ ] 所有資料已驗證無重複/錯誤

### API 與第三方服務

- [ ] Google Maps API Key 已申請（或 Leaflet 已配置）
- [ ] API 配額足夠（至少 100k 請求/月）
- [ ] 錯誤重試機制已實現

### 效能基準

- [ ] 首屏加載時間 < 3 秒
- [ ] 行程生成時間 < 500ms（30 天內）
- [ ] 地圖交互響應 < 100ms
- [ ] Lighthouse 評分 > 80

### 瀏覽器相容性

- [ ] Chrome >= 90
- [ ] Firefox >= 88
- [ ] Safari >= 14
- [ ] Edge >= 90

---

## 🔟 GitHub Issues 模板

### 功能實現 Issue 範例

```markdown
## [F-01] 日期區間選擇

**優先級**: 🔴 HIGH
**估計工作時間**: 4 小時

### 說明

使用者可透過日曆元件選擇「出發日期」與「結束日期」。

### 驗收標準

- [ ] 日期選擇器UI 完整
- [ ] 驗證最大 180 天區間
- [ ] 不能選過去日期
- [ ] 選擇變更事件觸發正確
- [ ] 響應式設計測試通過

### 子任務

- [ ] F-01.1: 建立日期選擇器元件
- [ ] F-01.2: 實現驗證邏輯
- [ ] F-01.3: 整合 Pinia 狀態
- [ ] F-01.4: 單元測試覆蓋率 >= 80%
```

---

## 1️⃣1️⃣ 後續擴充 (Future Scope)

> 保留此區塊能向面試官證明你具備系統迭代的規劃能力

### Phase 2 功能 (3-6 個月)

- **外部 API 串接**：
  - 串接 Skyscanner API 估算點對點機票成本
  - 顯示路線總成本預估
- **使用者帳戶系統**：
  - Firebase 認證
  - 允許儲存並分享規劃好的行程
  - 行程歷史記錄
- **進階時區轉換**：
  - 支援跨時區時間轉換
  - 統一以使用者本地時間顯示開賽時間
  - 自動偵測時區變化

### Phase 3 功能 (6-12 個月)

- **AI 推薦優化**：
  - 基於使用者偏好的個性化推薦
  - 考慮酒店/機票成本的全局最優解
- **社群功能**：
  - 行程分享和評論
  - 其他用戶經驗分享
  - 行程難度評級
- **行程細節補充**：
  - 推薦酒店 API 整合
  - 餐廳推薦
  - 當地景點推薦

- **行動 App**：
  - React Native / Flutter 行動版本
  - 離線地圖支援
  - 推播通知（比賽提醒）

---

## 1️⃣2️⃣ 關鍵決策與風險評估

### 架構決策

| 決策          | 理由                 | 風險                    | 舒緩方案              |
| ------------- | -------------------- | ----------------------- | --------------------- |
| 純前端無後端  | 部署簡單，適合 MVP   | 資料規模限制            | 未來可轉換為全棧      |
| 貪婪演算法    | 快速、易理解         | 非全局最優              | 日後轉向 DP/遺傳演算  |
| JSON 靜態資料 | 載入快、無伺服器成本 | 2026 賽程若變更手動維護 | 建立資料管理工具      |
| Google Maps   | 功能完整、穩定       | 收費可能超支            | 準備 Leaflet 備用方案 |

### 技術風險

| 風險                              | 可能性 | 影響 | 解決方案                 |
| --------------------------------- | ------ | ---- | ------------------------ |
| 算法性能不足（> 500ms）           | 低     | 高   | 實現以預計算結果快取     |
| 地圖 API 配額超限                 | 中     | 中   | 監控使用量、實現客端快取 |
| 瀏覽器相容性問題                  | 低     | 中   | 早期進行多瀏覽器測試     |
| TypeScript 型別錯誤導致執行時崩潰 | 低     | 高   | 嚴格模式 + 全面單測      |

---

## 1️⃣3️⃣ 測試策略 (Testing Strategy)

### 單元測試 (Unit Tests)

```
覆蓋率目標: >= 80%

測試檔案位置: src/**/__tests__/**/*.spec.ts

- utils/distance.spec.ts         // Haversine 計算測試
- services/routingEngine.spec.ts // 路由演算測試
- utils/timeZone.spec.ts         // 時區轉換測試
```

### 整合測試 (Integration Tests)

```
- 資料載入流程
- Pinia store 狀態同步
- 地圖與時間軸聯動
```

### E2E 測試 (End-to-End Tests)

```
使用 Playwright / Cypress

- 使用者完整旅程（選擇日期 → 選擇球場 → 查看結果）
- 響應式設計測試
- 跨瀏覽器相容性
```

---

## 1️⃣4️⃣ 部署與發佈

### 開發環境

```bash
npm run dev  # Vite 開發伺服器 localhost:5173
```

### 生產構建

```bash
npm run build  # 生成 dist/ 優化版本
npm run preview # 預覽生產版本
```

### 部署選項

- **Vercel** (推薦): 自動 CI/CD、預覽環境、全球 CDN
- **Netlify**: 類似 Vercel，支援環境變數管理
- **GitHub Pages**: 免費但無背端支援
- **自主伺服器**: Nginx / Apache（適合未來後端擴展）

### 環境變數

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_API_BASE_URL=https://api.example.com (Phase 2)
```

---

## 1️⃣5️⃣ 成功指標 (Success Metrics)

### 功能完整性

- ✅ 所有 F-01 ~ F-11 功能已實現
- ✅ Design System 完全遵循 MLB 風格
- ✅ 所有資料模型型別安全（TypeScript strict）

### 效能指標

- ✅ Lighthouse 評分 >= 85
- ✅ 首屏加載 < 2.5 秒
- ✅ 行程生成 < 300ms
- ✅ 移動裝置 FCP < 1.5 秒

### 使用者體驗

- ✅ 無明顯 UI 錯誤或閃爍
- ✅ 地圖交互流暢（FPS >= 60）
- ✅ 時間軸捲動無卡頓
- ✅ 行動版本完全可用

### 代碼品質

- ✅ 測試覆蓋率 >= 80%
- ✅ TypeScript 嚴格模式無錯誤
- ✅ ESLint 無警告
- ✅ 程式碼註解完整（>= 50% 複雜函式）

---

## 附錄：快速參考

### 常用命令

```bash
# 開發
npm run dev

# 構建
npm run build

# 預覽
npm run preview

# 型別檢查
tsc --noEmit

# 測試
npm run test

# 覆蓋率報告
npm run test:coverage
```

### Pinia Store 快速模板

```typescript
// stores/exampleStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useExampleStore = defineStore('example', () => {
  const state = ref<SomeType | null>(null); // 替換 SomeType 為實際型別，禁用 any

  const action = () => {
    // 實現邏輯
  };

  return { state, action };
});
```

### Vue 3 `<script setup>` 範例

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Stadium } from '@/types';

interface Props {
  stadium: Stadium;
}

defineProps<Props>();

const count = ref(0);

const doubled = computed(() => count.value * 2);
</script>

<template>
  <div>{{ stadium.teamName }}: {{ doubled }}</div>
</template>

<style scoped>
/* 元件樣式 */
</style>
```
