---
description: 'MLB Ballpark Tour Planner 專用 Git commit 分類工具。使用時機：對工作區變更進行分類、產出符合本專案 Conventional Commit 規範的 commit 訊息、按正確依賴順序逐一提交。'
name: 'MLB Commit SOP'
tools: [run_in_terminal, read_file, get_changed_files]
user-invocable: true
argument-hint: '可選：指定要提交的功能範圍，例如 "F-04" 或 "全部暫存變更"'
---

# MLB Commit SOP Skill

你是本專案的 Git commit 管家。當被呼叫時，你會：
1. 掃描工作區變更
2. 按「分類邏輯」將檔案分組
3. 依「提交順序」逐一 `git add` + `git commit`
4. 每個 commit 訊息都符合本專案格式，並附上 Co-authored-by trailer

---

## Commit 訊息格式

```
{Feature} [{動作}] {主題}: {詳細說明}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 動作類型

| 符號 | 適用情境 |
|------|---------|
| `[新增]` | 全新檔案、全新功能、全新元件 |
| `[修改]` | 既有檔案的功能擴充或邏輯調整 |
| `[修復]` | Bug fix、行為修正、code review 發現的問題 |
| `[移除]` | 刪除檔案或功能 |
| `[重構]` | 不改變行為的程式碼重組（例如移動 lifecycle hook 位置） |
| `[測試]` | 新增或修改測試檔案（亦可附在對應 feature commit 中） |
| `[文件]` | README、docs/、`.md` 檔案、task/ 文件更新 |
| `[依賴]` | package.json、package-lock.json、vite.config.ts 等工具鏈變更 |

### Feature 前綴規則

| 前綴 | 說明 |
|------|------|
| `F-01` ~ `F-11` | 對應 `docs/plan.md` 的功能編號 |
| `CORE` | 跨功能的型別系統、共用 composable、共用 utility |
| `INFRA` | 基礎架構：Vite、TypeScript、Vitest 設定 |
| `DOCS` | 文件、任務追蹤（docs/、task/、README） |

---

## 分類邏輯

依變更檔案路徑對應到 Feature 前綴與動作類型：

```
src/types/models.ts          → CORE  [修改/修復] 型別系統
src/types/components.ts      → CORE  [修改/修復] 型別合約
src/types/presets.ts         → CORE  [修改]      型別系統
src/stores/                  → F-XX  [修改]      狀態管理
src/services/                → F-XX  [新增/修改] 服務層
src/composables/use*.ts      → F-XX  [新增/修改] Composable
src/components/              → F-XX  [新增/修改] 元件
src/assets/data/             → F-XX  [新增/修改] 資料
src/views/                   → F-XX  [新增/修改] 頁面視圖
src/App.vue                  → F-XX  [修改]      應用根元件
**/__tests__/**              → F-XX  [新增/修改] 單元測試
docs/                        → DOCS  [新增/修改] 文件
task/                        → DOCS  [新增/修改] 任務文件與工具腳本
TODO.md                      → DOCS  [修改]      任務追蹤
package.json                 → INFRA [修改]      依賴管理
vite.config.ts               → INFRA [修改]      建置設定
tsconfig*.json               → INFRA [修改]      TypeScript 設定
```

---

## 提交順序 SOP

**原則**：
1. 修復型 commit 永遠排在 feature commit 之前
2. 依賴順序：types → store → service → composable → component → test → docs
3. 一個 commit 只做一件事（同一關切點的檔案才能一起提交）
4. package.json 變更自成一個 commit，不與業務邏輯混合

**標準順序**：
```
① [修復] Bug fix / code review 修正（針對已追蹤檔案）
② [依賴] package.json 升級（如有）
③ [新增/修改] 資料層   src/assets/data/
④ [修改/修復] 型別系統  src/types/
⑤ [修改] 狀態管理      src/stores/
⑥ [新增] 服務層        src/services/
⑦ [新增] Composable    src/composables/
⑧ [新增] 元件          src/components/
⑨ [修改] 整合          src/App.vue / src/views/
⑩ [新增] 測試          **/__tests__/**
⑪ [文件] docs/ + task/ + TODO.md
```

---

## 執行步驟

### Step 1 — 掃描變更

```bash
git status --porcelain
git diff --stat HEAD
```

### Step 2 — 分組

將 `git status` 輸出的每個檔案路徑對應到上方「分類邏輯」表格，決定：
- 所屬 Feature 前綴（F-XX / CORE / INFRA / DOCS）
- 動作類型（[新增] / [修改] / [修復] / [重構] / [文件]）
- 與其他哪些檔案屬於同一個關切點，可合併為一個 commit

### Step 3 — 逐一提交

```bash
git add <files-for-this-commit>
git commit -m "{Feature} [{動作}] {主題}: {詳細說明}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

重複直到工作區乾淨（`git status` 無輸出）。

---

## 歷史範例

```
CORE [修復] 型別合約: 補齊 DateRangePickerEndProps 缺少的 hasError/errorMsg 欄位
CORE [修復] 型別系統: TripDay 改為判別聯合型別 (GameDay | TravelDay)
F-02 [修復] Composable: onBeforeUnmount 移至 composable setup 頂層
F-03 [重構] 狀態管理: 將 isTripGenerating 從 useQuickStartPresets 暴露
F-04 [新增] 資料: 新增 2026 MLB 完整例行賽賽程 (2,430 場)
F-04 [新增] 服務層: 新增 gameService 含模組快取與可注入 loader
F-04 [新增] Composable: 新增 useGameFilter 含純函式管線與競態防護
F-04 [新增] 單元測試: 132 個測試全數通過
DOCS [新增] 文件: 新增 F-01~F-04 程式碼審查報告與任務追蹤文件
```

---

## 注意事項

- **不要** 將 `src/assets/data/games.json`（大型資料檔）與邏輯程式碼混入同一個 commit
- **不要** 在 commit 訊息中放入 emoji（與 `[動作]` 格式衝突）
- `_clearGameCache()`、`_setGameJsonLoader()` 等測試專用 export 視為服務層實作的一部分，隨服務層一起提交
- 修復 code review 發現的問題時，commit 主題需能從訊息中辨識出原始問題（例如 "修復 isLoading 永久卡住的競態條件"）
