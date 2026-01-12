#!/bin/bash

# Vercel SSH 密钥配置脚本
# 这个脚本帮助你在 Vercel 中配置 SSH 密钥以访问私有 GitHub 仓库

set -e

echo "=========================================="
echo "Vercel SSH 密钥配置"
echo "=========================================="
echo ""

# 检查是否已有 SSH 密钥
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "❌ 未找到 SSH 密钥"
    echo ""
    echo "请先生成 SSH 密钥："
    echo "  ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N \"\""
    echo ""
    exit 1
fi

echo "✅ 找到 SSH 密钥"
echo ""

# 获取私钥内容
PRIVATE_KEY=$(cat ~/.ssh/id_ed25519)
PUBLIC_KEY=$(cat ~/.ssh/id_ed25519.pub)

echo "📋 SSH 公钥内容："
echo "=========================================="
echo "$PUBLIC_KEY"
echo "=========================================="
echo ""
echo "请将上面的公钥添加到 GitHub 账户："
echo "  1. 访问 https://github.com/settings/keys"
echo "  2. 点击 'New SSH key'"
echo "  3. 粘贴上面的公钥内容"
echo "  4. 点击 'Add SSH key'"
echo ""
read -p "已添加公钥到 GitHub？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先添加公钥到 GitHub，然后重新运行此脚本"
    exit 1
fi

echo ""
echo "现在需要在 Vercel 项目中配置环境变量"
echo ""
echo "请访问 Vercel Dashboard："
echo "  1. 打开你的项目"
echo "  2. 进入 Settings → Environment Variables"
echo "  3. 添加以下环境变量："
echo ""
echo "变量名: SSH_PRIVATE_KEY"
echo "值: (下面的私钥内容)"
echo "=========================================="
echo "$PRIVATE_KEY"
echo "=========================================="
echo ""
echo "变量名: SSH_KNOWN_HOSTS"
echo "值: github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6ZZJCpF8jO3+mWXvJaxzlHxwJnPEN"
echo ""
echo "✅ 配置完成！"
echo ""
echo "下次部署时，Vercel 将使用这些环境变量来访问私有 GitHub 仓库"
