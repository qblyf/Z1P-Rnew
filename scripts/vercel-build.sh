#!/bin/bash

# Vercel 构建脚本
# 处理 SSH 密钥配置以访问私有 GitHub 仓库

set -e

echo "🔧 配置 SSH..."

# 创建 .ssh 目录
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 如果提供了 SSH 私钥，配置它
if [ -n "$SSH_PRIVATE_KEY" ]; then
    echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    echo "✅ SSH 私钥已配置"
fi

# 如果提供了 known_hosts，配置它
if [ -n "$SSH_KNOWN_HOSTS" ]; then
    echo "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
    chmod 644 ~/.ssh/known_hosts
    echo "✅ SSH known_hosts 已配置"
else
    # 添加 GitHub 到 known_hosts
    ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true
    echo "✅ GitHub 已添加到 known_hosts"
fi

# 配置 git 使用 SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"
echo "✅ Git 已配置为使用 SSH"

echo ""
echo "📦 安装依赖..."
npm install --legacy-peer-deps

echo ""
echo "🏗️  构建项目..."
npm run build

echo ""
echo "✅ 构建完成！"
