# MLB Field - Interactive Commit Helper
# 用法: ./commit-helper.ps1
# 遵循 F-XX [新增/修改/移除] 主題:詳細說明 格式

param(
    [string]$Mode = "interactive"
)

function Show-Menu {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "MLB Field - Commit Helper" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "請選擇操作模式:" -ForegroundColor Yellow
    Write-Host "1. 自動檢測修改 - 智能分類並提交"
    Write-Host "2. 手動提交 - 選擇檔案後手動編寫 commit 訊息"
    Write-Host "3. 檢查狀態 - 查看目前修改狀態"
    Write-Host "4. 查看日誌 - 查看最近的 commit"
    Write-Host "5. 離開"
}

function Get-GitStatus {
    $status = git status --short 2>$null
    if (-not $status) {
        Write-Host "沒有修改需要提交" -ForegroundColor Green
        return $null
    }
    return $status -split "`n"
}

function Show-Status {
    Write-Host "`n========== 修改狀態 ==========" -ForegroundColor Cyan
    $status = Get-GitStatus
    if ($null -eq $status) { return }
    
    $status | ForEach-Object {
        if ($_ -match '^\s*M\s+(.+)$') {
            Write-Host "修改: $($matches[1])" -ForegroundColor Yellow
        }
        elseif ($_ -match '^\s*A\s+(.+)$') {
            Write-Host "新增: $($matches[1])" -ForegroundColor Green
        }
        elseif ($_ -match '^\s*D\s+(.+)$') {
            Write-Host "刪除: $($matches[1])" -ForegroundColor Red
        }
        elseif ($_ -match '^\s*\?\?\s+(.+)$') {
            Write-Host "未追蹤: $($matches[1])" -ForegroundColor Gray
        }
    }
    
    git diff --stat
}

function Show-CommitLog {
    Write-Host "`n========== 最近 10 個 Commits ==========" -ForegroundColor Cyan
    git log --oneline -10
}

function Get-FeatureNumber {
    $branches = git branch -a 2>$null
    if ($branches -match 'feature/F-(\d+)') {
        return $matches[1]
    }
    
    # 如果找不到，提示用戶輸入
    $featureNum = Read-Host "請輸入 Feature 編號 (例: 01)"
    return $featureNum
}

function Get-CommitType {
    Write-Host "`n選擇 Commit 類型:" -ForegroundColor Yellow
    Write-Host "1. [新增] - 新增功能或檔案"
    Write-Host "2. [修改] - 修改現有功能或檔案"
    Write-Host "3. [移除] - 刪除功能或檔案"
    Write-Host "4. [修復] - 修復 Bug"
    
    $choice = Read-Host "請選擇 (1-4)"
    
    $types = @{
        "1" = "[新增]"
        "2" = "[修改]"
        "3" = "[移除]"
        "4" = "[修復]"
    }
    
    return $types[$choice]
}

function Interactive-Commit {
    Write-Host "`n========== 交互式 Commit ==========" -ForegroundColor Cyan
    
    $featureNum = Get-FeatureNumber
    $commitType = Get-CommitType
    
    $subject = Read-Host "`n請輸入 commit 主題 (簡短描述，例: 新增日期選擇器)"
    $description = Read-Host "請輸入詳細說明 (可選，按 Enter 跳過)"
    
    $commitMessage = "F-$featureNum $commitType $subject"
    
    if ($description) {
        $commitMessage += "`n`n$description"
    }
    
    $commitMessage += "`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    
    # 顯示預覽
    Write-Host "`n========== Commit 預覽 ==========" -ForegroundColor Cyan
    Write-Host $commitMessage -ForegroundColor Green
    
    $confirm = Read-Host "`n確認提交? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        git add -A
        git commit -m $commitMessage --no-verify
        Write-Host "`n✓ Commit 成功！" -ForegroundColor Green
    }
    else {
        Write-Host "已取消 commit" -ForegroundColor Yellow
    }
}

function Auto-Commit {
    Write-Host "`n========== 自動檢測並提交 ==========" -ForegroundColor Cyan
    
    $status = Get-GitStatus
    if ($null -eq $status) { return }
    
    Show-Status
    
    # 分析修改類型
    $modifiedCount = ($status | Where-Object { $_ -match '^\s*M\s+' } | Measure-Object).Count
    $newCount = ($status | Where-Object { $_ -match '^\s*A\s+' } | Measure-Object).Count
    $deletedCount = ($status | Where-Object { $_ -match '^\s*D\s+' } | Measure-Object).Count
    
    Write-Host "`n檢測到修改:" -ForegroundColor Yellow
    Write-Host "修改檔案: $modifiedCount" -ForegroundColor Yellow
    Write-Host "新增檔案: $newCount" -ForegroundColor Green
    Write-Host "刪除檔案: $deletedCount" -ForegroundColor Red
    
    Write-Host "`n請按照以下步驟逐個提交:" -ForegroundColor Cyan
    Write-Host "提示: 使用 git add <path> 選擇要提交的檔案，然後使用此工具手動提交" -ForegroundColor Cyan
    Write-Host "`n執行: git add <檔案路徑>" -ForegroundColor Gray
    Write-Host "然後運行: ./commit-helper.ps1 手動編寫 commit 訊息" -ForegroundColor Gray
}

# 主程式
if ($Mode -eq "interactive") {
    do {
        Show-Menu
        $choice = Read-Host "`n請選擇 (1-5)"
        
        switch ($choice) {
            "1" { Auto-Commit }
            "2" { Interactive-Commit }
            "3" { Show-Status }
            "4" { Show-CommitLog }
            "5" { 
                Write-Host "`n再見！" -ForegroundColor Green
                break
            }
            default { Write-Host "無效的選擇" -ForegroundColor Red }
        }
    } while ($choice -ne "5")
}
