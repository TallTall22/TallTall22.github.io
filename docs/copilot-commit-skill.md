# Copilot Commit Skill — MLB Ballpark Tour Planner

## 用途 (Purpose)
此 Skill 協助你對 MLB Ballpark Tour Planner 專案的變更進行分類並產出精確的 Git commit 訊息，遵照本專案的 Conventional Commit 規範。

## Commit 訊息格式
```
{Feature} [{動作}] {主題}: {詳細說明}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 動作類型 (Action Types)
| 符號 | 適用情境 |
|------|---------|
| `[新增]` | 全新檔案、全新功能、全新元件 |
| `[修改]` | 既有檔案的功能擴充或邏輯調整 |
| `[修復]` | Bug fix、行為修正 |
| `[移除]` | 刪除檔案或功能 |
| `[重構]` | 不改變行為的程式碼重組 |
| `[測試]` | 新增或修改測試檔案 |
| `[文件]` | README、docs/、註解更新 |
| `[依賴]` | package.json、lock 檔案變更 |

### Feature 命名規則
- 對應 `plan.md` 的功能編號：`F-01`、`F-02`、`F-03` ... `F-11`
- 跨功能的共用更動：`CORE`
- 基礎架構更動：`INFRA`
- 文件相關：`DOCS`

## 拆分 Commit 的原則
1. **一個 commit 只做一件事** — 型別定義、服務層、Composable、元件、測試各自獨立
2. **依賴順序提交** — types → store → service → composable → component → test → integration → docs
3. **修復型 commit 優先** — Bug fix 永遠排在 feature commit 前面
4. **依賴升級獨立** — package.json 變更自成一個 commit，不與業務邏輯混合

## 分類邏輯 (Classification Logic)

```
src/types/          → F-XX [修改] 型別系統
src/stores/         → F-XX [修改] 狀態管理
src/services/       → F-XX [新增] 服務層
src/composables/    → F-XX [新增] Composable
src/components/     → F-XX [新增] 元件
src/assets/data/    → F-XX [新增] 資料
src/views/          → F-XX [新增/修改] 頁面視圖
src/App.vue         → F-XX [修改] 應用根元件
docs/               → DOCS [新增/修改] 文件
TODO.md             → DOCS [新增/修改] 任務追蹤
package.json        → INFRA [修改] 開發依賴
**/__tests__/**     → F-XX [新增/修改] 單元測試
```

## 標準作業流程 (SOP)

### Step 1: 掃描變更
```bash
git status --porcelain
git diff --stat HEAD
```

### Step 2: 按類別分組
將所有變更檔案依上方「分類邏輯」分組，確認每組只包含同一關切點的檔案。

### Step 3: 確認提交順序
```
[修復] Bug fix
[依賴] package.json 升級
[新增/修改] 資料層 (assets/data/)
[修改] 型別系統 (types/)
[修改] 狀態管理 (stores/)
[新增] 服務層 (services/)
[新增] Composable (composables/)
[新增] 元件 (components/)
[修改] 整合 (App.vue / views/)
[新增] 測試 (已附在各層 commit 或獨立)
[文件] docs/ + TODO.md
```

### Step 4: 逐一提交
```bash
git add <files-for-this-commit>
git commit -m "F-XX [類型] 主題: 詳細說明

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## 歷史範例 (Reference Examples from This Project)

```
F-01 [新增] 控制面板組件: 新增日期範圍選擇器組件
F-01 [修改] 應用入口: 整合 Vuetify 與 Pinia
F-02 [修復] 日期工具: addDays 修正 UTC 偏移導致日期跨日的錯誤
F-02 [新增] 資料: 新增 30 支 MLB 球隊靜態資料 (stadiums.json)
F-02 [修改] 型別系統: 新增 StadiumLoadErrorCode、StadiumLoadResult 錯誤型別
F-02 [修改] 狀態管理: 擴充 tripStore 新增 homeStadiumId 與 setHomeStadium
F-02 [新增] 服務層: 新增 stadiumService 非同步載入並包含錯誤處理
F-02 [新增] Composable: 新增 useStadiumSelector 含球隊搜尋與載入狀態
F-02 [新增] 元件: 新增 StadiumSelector 可搜尋下拉選單含球隊標誌
F-02 [修改] 應用根元件: 整合 StadiumSelector 至主頁面
```

## 與 commit-helper.ps1 的差異
`commit-helper.ps1` 提供互動式 CLI 介面，適合手動操作。
本 Skill 提供給 Copilot Agent 使用，讓 AI 在執行批次 commit 時遵守相同規範。
