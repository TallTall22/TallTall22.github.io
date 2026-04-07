#!/bin/bash

# MLB Field - Interactive Commit Helper
# 用法: bash commit-helper.sh
# 遵循 F-XX [新增/修改/移除] 主題:詳細說明 格式

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

show_menu() {
    echo -e "\n${CYAN}========================================"
    echo "MLB Field - Commit Helper"
    echo -e "========================================\n${NC}"
    
    echo -e "${YELLOW}請選擇操作模式:${NC}"
    echo "1. 自動檢測修改 - 智能分類並提交"
    echo "2. 手動提交 - 選擇檔案後手動編寫 commit 訊息"
    echo "3. 檢查狀態 - 查看目前修改狀態"
    echo "4. 查看日誌 - 查看最近的 commit"
    echo "5. 離開"
}

get_git_status() {
    git status --short 2>/dev/null || echo ""
}

show_status() {
    echo -e "\n${CYAN}========== 修改狀態 ==========${NC}"
    status=$(get_git_status)
    
    if [ -z "$status" ]; then
        echo -e "${GREEN}沒有修改需要提交${NC}"
        return
    fi
    
    echo "$status" | while read line; do
        if [[ $line =~ ^\ M\ (.+)$ ]]; then
            echo -e "${YELLOW}修改: ${BASH_REMATCH[1]}${NC}"
        elif [[ $line =~ ^\ A\ (.+)$ ]]; then
            echo -e "${GREEN}新增: ${BASH_REMATCH[1]}${NC}"
        elif [[ $line =~ ^\ D\ (.+)$ ]]; then
            echo -e "${RED}刪除: ${BASH_REMATCH[1]}${NC}"
        elif [[ $line =~ ^\?\?\ (.+)$ ]]; then
            echo -e "${CYAN}未追蹤: ${BASH_REMATCH[1]}${NC}"
        fi
    done
    
    echo -e "\n${CYAN}=== 文件統計 ===${NC}"
    git diff --stat
}

show_commit_log() {
    echo -e "\n${CYAN}========== 最近 10 個 Commits ==========${NC}"
    git log --oneline -10
}

get_feature_number() {
    branch=$(git branch --show-current 2>/dev/null || echo "")
    
    if [[ $branch =~ feature/F-([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        read -p "請輸入 Feature 編號 (例: 01): " featureNum
        echo "$featureNum"
    fi
}

get_commit_type() {
    echo -e "\n${YELLOW}選擇 Commit 類型:${NC}"
    echo "1. [新增] - 新增功能或檔案"
    echo "2. [修改] - 修改現有功能或檔案"
    echo "3. [移除] - 刪除功能或檔案"
    echo "4. [修復] - 修復 Bug"
    
    read -p "請選擇 (1-4): " choice
    
    case $choice in
        1) echo "[新增]" ;;
        2) echo "[修改]" ;;
        3) echo "[移除]" ;;
        4) echo "[修復]" ;;
        *) echo "[修改]" ;;
    esac
}

interactive_commit() {
    echo -e "\n${CYAN}========== 交互式 Commit ==========${NC}"
    
    featureNum=$(get_feature_number)
    commitType=$(get_commit_type)
    
    read -p $'\n請輸入 commit 主題 (簡短描述，例: 新增日期選擇器): ' subject
    read -p "請輸入詳細說明 (可選，按 Enter 跳過): " description
    
    commitMessage="F-$featureNum $commitType $subject"
    
    if [ ! -z "$description" ]; then
        commitMessage="$commitMessage"$'\n\n'"$description"
    fi
    
    commitMessage="$commitMessage"$'\n\n'"Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    
    # 顯示預覽
    echo -e "\n${CYAN}========== Commit 預覽 ==========${NC}"
    echo -e "${GREEN}$commitMessage${NC}"
    
    read -p $'\n確認提交? (y/n): ' confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        git add -A
        git commit -m "$commitMessage" --no-verify
        echo -e "\n${GREEN}✓ Commit 成功！${NC}"
    else
        echo -e "${YELLOW}已取消 commit${NC}"
    fi
}

auto_commit() {
    echo -e "\n${CYAN}========== 自動檢測並提交 ==========${NC}"
    
    status=$(get_git_status)
    if [ -z "$status" ]; then
        echo -e "${GREEN}沒有修改需要提交${NC}"
        return
    fi
    
    show_status
    
    # 分析修改類型
    modifiedCount=$(echo "$status" | grep -c "^ M " || echo "0")
    newCount=$(echo "$status" | grep -c "^ A " || echo "0")
    deletedCount=$(echo "$status" | grep -c "^ D " || echo "0")
    
    echo -e "\n${YELLOW}檢測到修改:${NC}"
    echo -e "${YELLOW}修改檔案: $modifiedCount${NC}"
    echo -e "${GREEN}新增檔案: $newCount${NC}"
    echo -e "${RED}刪除檔案: $deletedCount${NC}"
    
    echo -e "\n${CYAN}請按照以下步驟逐個提交:${NC}"
    echo -e "${CYAN}提示: 使用 git add <path> 選擇要提交的檔案，然後使用此工具手動提交${NC}"
    echo -e "\n${CYAN}執行: git add <檔案路徑>${NC}"
    echo -e "然後運行: bash commit-helper.sh 手動編寫 commit 訊息${NC}"
}

# 主程式
while true; do
    show_menu
    read -p "請選擇 (1-5): " choice
    
    case $choice in
        1) auto_commit ;;
        2) interactive_commit ;;
        3) show_status ;;
        4) show_commit_log ;;
        5) 
            echo -e "\n${GREEN}再見！${NC}"
            break
            ;;
        *) echo -e "${RED}無效的選擇${NC}" ;;
    esac
done
