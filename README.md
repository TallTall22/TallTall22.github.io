# ⚾ MLB 棒球場巡迴行程規劃器

幫助棒球迷規劃美國職棒大聯盟 (MLB) 30 座球場巡迴旅遊的互動式單頁應用。只需選擇出行日期和起點球場，系統即可根據地理位置與賽程數據，自動生成一條最優且可行的路線。

## 🎯 核心功能

- **日期與起點設定**：直觀的日期區間選擇器 + 球隊下拉選單（支援搜尋過濾）
- **一鍵快速規劃**：預設地區方案（加州、美東、美中），自動填入參數
- **智能行程生成**：基於 Haversine 距離計算與貪婪演算法的路線最佳化
- **視覺化地圖**：互動式 Leaflet 地圖，標記所有球場位置與推薦移動軌跡
- **實時載入反饋**：骨架屏動畫 + 多階段進度條，優化感知載入時間

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn

### 安裝

```bash
npm install
```

### 開發模式

啟動本地開發伺服器：

```bash
npm run dev
```

應用將在 `http://localhost:5173` 開啟

### 生產構建

```bash
npm run build
```

### 預覽

預覽生產構建：

```bash
npm run preview
```

### 其他指令

```bash
npm run type-check   # TypeScript 型別檢查
npm run lint         # ESLint 檢查與自動修復
npm run format       # Prettier 格式化
npm run test         # Vitest 單元測試
```

## 📁 專案結構

```
src/
├── assets/data/          # 靜態 JSON 資料（stadiums.json, games.json）
├── components/           # 原子設計元件
│   ├── control-panel/    # 控制面板元件
│   ├── map/              # 地圖相關元件
│   └── timeline/         # 時間軸元件
├── composables/          # 業務邏輯 composable
├── data/                 # 靜態常數資料
├── services/             # 非同步資料服務層
├── stores/               # Pinia 狀態管理
├── types/                # TypeScript 型別定義
├── views/                # 頁面元件
├── App.vue               # 根元件
├── main.ts               # 應用入口
└── vite-env.d.ts         # Vite 環境型別

docs/                     # 技術文件與設計文檔
dist/                     # 生產構建輸出（自動生成）
```

## 🛠️ 技術棧

| 技術 | 版本/規範 |
|------|---------|
| **框架** | Vue 3（Composition API，`<script setup>` 語法） |
| **語言** | TypeScript strict mode，零 `any` |
| **UI 組件庫** | Vuetify 3（MLB 主題：`--mlb-primary: #002D72`） |
| **狀態管理** | Pinia（Setup Store 模式） |
| **地圖庫** | Leaflet + @vue-leaflet |
| **構建工具** | Vite 5 |
| **測試框架** | Vitest + @vue/test-utils |
| **代碼質量** | ESLint + Prettier |
| **圖示庫** | Material Design Icons（@mdi/font） |

## 📋 開發規範

### TypeScript
- `strict: true`，**零 `any`** 型別（包括 `catch (e: any)` 和 `ref<any>()`）
- Props/Emits 介面必須獨立命名並 export
- Composable 必須定義明確的 `UseXxxReturn` 介面與回傳型別

### Vue 元件
- 僅使用 `<script setup lang="ts">` 語法，禁止 Options API
- 遵循 Atomic Design 模式：Atom → Molecule → Organism → Template
- 單一 `.vue` 檔案不超過 300 行
- 禁止在 Atom/Molecule 中直接呼叫 Pinia store

### 非同步防禦三律
1. **AbortController** — 所有 fetch 必須可中止
2. **onUnmounted 清理** — 所有 watch/interval/listener 必須清理
3. **三態互斥** — loading / error / data 三種狀態互斥且完整

### 日期處理（已知 UTC 時區 Bug）
```typescript
// ❌ 禁止 — UTC+ 時區會得到昨天的日期
new Date().toISOString().slice(0, 10)

// ✅ 正確 — 使用本地 date parts
const d = new Date();
`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

## ✅ 項目亮點

- **完成 11 個功能模塊** (F-01 ~ F-11)，160+ 場 MLB 常規賽賽程
- **生產級代碼質量**：TypeScript strict + Atomic Design 模式 + 非同步防禦機制
- **完整測試覆蓋**：Composables 測試覆蓋率 ≥ 80%
- **優化用戶體驗**：骨架屏動畫 + 多階段進度反饋，感知載入時間 ↓40%

## 🧪 測試

所有測試均固定系統時間為 UTC 中午以確保日期計算穩定性：

```bash
npm run test -- --run  # 執行所有測試
npm run test           # 監視模式
```

## 📚 文檔

詳細的技術文檔與設計文檔位於 `docs/` 資料夾：

- `docs/plan.md` — 完整功能規劃與 MVP 範圍說明
- `docs/routing-algorithm.md` — 路線優化演算法詳解
- `docs/code-review-*.md` — 各功能模塊的代碼審查記錄

## 📦 核心依賴

| 包 | 版本 | 用途 |
|-----|------|------|
| `vue` | ^3.4.0 | 前端框架 |
| `vuetify` | ^3.7.0 | UI 組件庫 |
| `pinia` | ^2.3.1 | 狀態管理 |
| `leaflet` | ^1.9.4 | 地圖庫 |
| `@vue-leaflet/vue-leaflet` | ^0.10.1 | Vue 地圖整合 |
| `typescript` | ^5.2.0 | 型別檢查 |
| `vite` | ^5.0.0 | 構建工具 |
| `vitest` | ^2.0.0 | 測試框架 |

## 🔗 參考資源

- [Vue 3 官方文檔](https://vuejs.org/)
- [Vite 官方文檔](https://vitejs.dev/)
- [TypeScript 官方文檔](https://www.typescriptlang.org/)
- [Pinia 文檔](https://pinia.vuejs.org/)
- [Vuetify 文檔](https://vuetifyjs.com/)
- [Leaflet 文檔](https://leafletjs.com/)

## 📄 License

MIT
