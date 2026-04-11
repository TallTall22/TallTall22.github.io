# MLB Ballpark Tour Planner — Copilot Instructions

Vue 3 + TypeScript (strict) + Vuetify 3 + Pinia + Vite + Vitest

---

## Project Stack

| 技術 | 版本/規範 |
|------|---------|
| **Framework** | Vue 3, `<script setup>` only, no Options API |
| **Language** | TypeScript strict, zero `any` |
| **UI Library** | Vuetify 3 (MLB theme: `--mlb-primary: #002D72`) |
| **State** | Pinia Setup Store (`defineStore('id', () => {})`) |
| **Build** | Vite, `@/` alias → `src/` |
| **Testing** | Vitest + @vue/test-utils |
| **Package Manager** | npm |

## Common Commands

```bash
npm run dev          # 開發伺服器
npm run build        # 生產構建
npm run type-check   # TypeScript 型別檢查
npm run test -- --run  # 執行所有測試
```

---

## Project Structure

```
src/
├── assets/data/      # 靜態 JSON 資料 (stadiums.json, games.json)
├── components/       # Atomic Design 元件 (control-panel/, map/, timeline/)
├── composables/      # useXxx 業務邏輯 composables
├── data/             # 靜態常數資料 (presets.ts)
├── services/         # 非同步資料服務層
├── stores/           # Pinia stores (tripStore)
├── test-utils/       # 測試共用常數 (constants.ts)
├── types/            # TypeScript 型別 (models.ts, components.ts, presets.ts)
├── views/            # 頁面元件
├── App.vue           # 根元件
├── main.ts           # 應用入口
└── vite-env.d.ts     # Vite 環境型別
docs/                 # 技術文件 (plan.md, code-review-*.md)
TODO.md               # BDD 任務追蹤
```

---

## Git Commit Skill

### 格式
```
{Feature} [{動作}] {主題}: {詳細說明}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 動作類型
| 符號 | 適用情境 |
|------|---------|
| `[新增]` | 全新檔案、全新功能 |
| `[修改]` | 既有檔案的功能擴充 |
| `[修復]` | Bug fix、行為修正 |
| `[移除]` | 刪除檔案或功能 |
| `[重構]` | 不改變行為的程式碼重組 |
| `[測試]` | 新增或修改測試 |
| `[文件]` | docs/、README、註解 |
| `[依賴]` | package.json 變更 |

### Feature 前綴
```
F-01 ~ F-11  → 對應 docs/plan.md 功能編號
CORE         → 跨功能共用邏輯
INFRA        → 構建工具、環境配置
DOCS         → 純文件更動
```

### 提交依賴順序（嚴格遵守）
```
[修復] Bug fix
  ↓  src/types/          → F-XX [修改] 型別系統
  ↓  src/stores/         → F-XX [修改] 狀態管理
  ↓  src/services/       → F-XX [新增/修復] 服務層
  ↓  src/composables/    → F-XX [新增] Composable
  ↓  src/components/     → F-XX [新增] 元件
  ↓  src/App.vue         → F-XX [修改] 應用根元件
  ↓  **/__tests__/       → F-XX [新增] 單元測試
  ↓  docs/ + TODO.md     → DOCS [文件]
```

### SOP
```bash
git status --porcelain          # 掃描所有變更
git reset HEAD                  # 若需重新分組，先全部 unstage
git add <specific-files>        # 只加本次 commit 的檔案
git commit -m "F-XX [類型] ..."  # 提交
```

### 歷史範例
```
INFRA [新增] Vite 環境配置: 新增 vite-env.d.ts 型別參考
CORE  [新增] 測試工具: 新增 test-utils/constants.ts 統一日期常數
F-01  [修復] 日期元件: 修正 todayISO() UTC 時區偏移
F-02  [修復] 服務層: 新增 isStadiumArray() 執行期型別守衛
F-03  [新增] 型別系統: 新增 PresetRegion、QuickStartPreset 型別
F-03  [修改] 狀態管理: 新增 tripGenerationRequestId 計數器
F-03  [新增] Composable: 新增 useQuickStartPresets
F-03  [新增] 元件: 新增 PresetBadge、PresetButtonGroup、QuickStartPresets
DOCS  [新增] 文件: 新增 code-review-f03.md
```

---

## Code Standards

### TypeScript 強制規範
- `strict: true`，**零 `any`**（含 `catch (e: any)` 和 `ref<any>()`）
- Props/Emits 介面必須獨立命名並 `export`
- Composable 必須定義 `export interface UseXxxReturn` 並顯式標注回傳型別
- Error 必須轉換為應用層 union type，禁止直接 re-throw 原始 Error

### Vue 元件規範
- 僅使用 `<script setup lang="ts">`，禁止 Options API
- Atomic Design: **Atom** → **Molecule** → **Organism** → **Template**
- 禁止在 Atom/Molecule 中呼叫 Pinia store
- 單一 `.vue` 檔案不超過 300 行

### 非同步防禦三律
```typescript
// 律一: 所有 fetch 加 AbortController
const ctrl = new AbortController();
onUnmounted(() => ctrl.abort());

// 律二: 所有 watch 在 onUnmounted 清理
const stop = watch(source, handler);
onUnmounted(stop);

// 律三: loading / error / data 三態互斥
const isLoading = ref(false);
const error     = ref<AppErrorCode | null>(null);
const data      = ref<T | null>(null);
```

### 日期處理（已知 UTC 時區 Bug）
```typescript
// ❌ 禁止 — 在 UTC+ 時區會得到昨天的日期
new Date().toISOString().slice(0, 10)
someDate.toISOString().slice(0, 10)

// ✅ 正確 — 使用本地 date parts
const d = new Date();
return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

### 狀態歸屬五層
```
Local UI state  → ref() in component
Shared logic    → composable (useXxx)
Cross-feature   → provide/inject
Global          → Pinia store
URL-driven      → vue-router query
```

---

## Testing Standards

- 時間固定：`vi.setSystemTime(new Date('YYYY-MM-DDT12:00:00Z'))` (UTC noon)
- 測試日期常數：`src/test-utils/constants.ts`
- Component emit 斷言：用 `toStrictEqual`（非 `toBe`，因 Vue Proxy wrapper）
- Composable 覆蓋率目標 ≥ 80%
- Vuetify 測試需要 `server.deps.inline: ['vuetify']` in vite.config.ts
- jsdom 不支援 HTML `disabled` 阻止 click：必須在 click handler 加 `if (props.disabled) return`
