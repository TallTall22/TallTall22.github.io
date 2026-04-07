# 🚀 Commit 規範與工具使用指南

## Commit 訊息格式

本專案遵循以下 commit 訊息格式：

```
F-XX [類型] 主題:詳細說明

詳細描述（可選）

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 格式說明

- **F-XX**: Feature 編號（例: F-01）
- **[類型]**: 修改類型
  - `[新增]` - 新增功能、組件或檔案
  - `[修改]` - 修改現有功能或檔案
  - `[移除]` - 刪除功能或檔案
  - `[修復]` - 修復 Bug
- **主題**: 簡短的單句描述（中文或英文）
- **詳細說明**: 複雜修改時的詳細描述（可選）

### Commit 訊息範例

#### 例子 1: 新增功能
```
F-01 [新增] 依賴管理:新增 Vuetify、Pinia、Vitest 依賴及測試工具

- 新增 Vuetify 3.7.0 用於 UI 元件
- 新增 Pinia 2.3.1 用於狀態管理
- 新增 @mdi/font 7.4.47 用於圖標
- 新增 Vitest 2.0.0 及相關測試工具

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

#### 例子 2: 修改配置
```
F-01 [修改] TypeScript 配置:新增路徑別名

- 新增 baseUrl 配置
- 新增 @ 別名指向 src 目錄

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

#### 例子 3: 刪除舊代碼
```
F-01 [移除] 舊組件:刪除 HelloWorld 示例組件

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## 使用 Commit Helper 工具

### Windows PowerShell

```powershell
# 執行 commit 助手
./commit-helper.ps1

# 或指定執行策略
powershell -ExecutionPolicy Bypass -File .\commit-helper.ps1
```

### Linux/macOS/Git Bash

```bash
# 執行 commit 助手
bash commit-helper.sh

# 或賦予執行權限
chmod +x commit-helper.sh
./commit-helper.sh
```

### 工具功能

1. **自動檢測修改** - 分析當前修改並提示分類建議
2. **手動提交** - 交互式編寫完整 commit 訊息
3. **檢查狀態** - 查看所有修改檔案
4. **查看日誌** - 查看最近 10 個 commits

## Commit 最佳實踐

### ✅ Do's（應該做）

- ✓ 保持每個 commit 的範圍小而專注
- ✓ 為每個邏輯變更建立單獨的 commit
- ✓ 使用清晰、描述性的主題
- ✓ 在詳細說明中解釋"為什麼"而不只是"是什麼"
- ✓ 使用過去式編寫 commit 訊息

### ❌ Don'ts（不應該做）

- ✗ 將多個不相關的修改混在一個 commit 中
- ✗ 編寫過於簡短或模糊的 commit 訊息
- ✗ 忽略空格或格式化的一致性
- ✗ Commit 未經測試的代碼

## 典型工作流程

### 場景 1: 新增單個功能

```bash
# 1. 建立 feature branch
git checkout -b feature/F-01-date-range-picker

# 2. 進行開發工作
# ... 編輯檔案 ...

# 3. 提交修改
bash commit-helper.sh
# 選擇 "2. 手動提交"
# 輸入訊息並確認

# 4. 推送到遠端
git push origin feature/F-01-date-range-picker
```

### 場景 2: 進行複雜功能（需要多個 commits）

```bash
# 1. 建立 feature branch
git checkout -b feature/F-02-complex-feature

# 2. 修改依賴
# ... 更新 package.json ...
bash commit-helper.sh

# 3. 修改配置
# ... 更新 config 檔案 ...
bash commit-helper.sh

# 4. 新增 composables
# ... 建立 src/composables/ ...
bash commit-helper.sh

# 5. 新增組件
# ... 建立 src/components/ ...
bash commit-helper.sh

# 6. 推送所有 commits
git push origin feature/F-02-complex-feature
```

## 查看提交歷史

```bash
# 查看最近 10 個 commits
git log --oneline -10

# 查看詳細 commit 資訊
git log --stat -5

# 查看特定 Feature 的 commits
git log --oneline --grep="F-01"

# 查看修改詳情
git show <commit-hash>
```

## 常見問題

### Q: 忘記添加 Co-authored-by 怎麼辦？
A: 執行 `git commit --amend` 編輯最後一個 commit，commit helper 工具會自動添加。

### Q: 不小心 commit 了不應該提交的檔案？
A: 執行 `git reset HEAD~1` 回滾最後一個 commit，然後重新提交。

### Q: 想修改已推送的 commit 訊息？
A: 執行 `git rebase -i origin/main` 進行交互式變基。**注意**: 僅在本地未被他人拉取時執行。

### Q: 如何取消一個 commit？
A: 執行 `git revert <commit-hash>` 建立新的 commit 撤銷修改。

## 與 Git 集成

你也可以建立 Git alias 來快速執行 commit helper：

```bash
# PowerShell
git config --global alias.commit-helper 'powershell -ExecutionPolicy Bypass -File ./commit-helper.ps1'

# 使用方法
git commit-helper
```

---

遵循這些規範有助於保持專案歷史清晰、易於追蹤和審查。祝你編碼愉快！⚾
