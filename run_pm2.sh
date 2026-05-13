#!/bin/bash
set -e

echo "========================================="
echo "  Gem Game - Deploy Script"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 1. Git Pull
echo ""
echo "▶ [1/4] Git Pull..."
git pull
echo "✅ Git Pull 完成"

# 2. Install dependencies
#echo ""
#echo "▶ [2/4] 安裝依賴..."
#npm install
#echo "✅ 依賴安裝完成"

# 3. Build
echo ""
echo "▶ [3/4] Build 專案..."
npm run build
echo "✅ Build 完成"

# 4. Restart PM2
echo ""
echo "▶ [4/4] 重啟 PM2 服務..."
pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
pm2 save
echo "✅ 服務已啟動"

echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
pm2 status
