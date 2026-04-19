#!/bin/bash
# 自动版本号脚本 - 在每次提交时调用

VERSION_FILE="version.txt"
DEFAULT_VERSION="1.0.0"

# 如果版本文件不存在，创建它
if [ ! -f "$VERSION_FILE" ]; then
    echo "$DEFAULT_VERSION" > "$VERSION_FILE"
    git add "$VERSION_FILE"
    exit 0
fi

# 读取当前版本
CURRENT_VERSION=$(cat "$VERSION_FILE")

# 解析版本号 (major.minor.patch)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# 递增 patch 版本
PATCH=$((PATCH + 1))

# 组合新版本
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# 写入版本文件
echo "$NEW_VERSION" > "$VERSION_FILE"

# 更新提交信息，添加版本号
NEW_MSG=$(cat "$1")
echo "[v$NEW_VERSION] $NEW_MSG" > "$1"

# 添加版本文件到暂存
git add "$VERSION_FILE"

echo "版本已更新: $CURRENT_VERSION -> $NEW_VERSION"
