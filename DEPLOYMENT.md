# 部署指南

## Vercel 部署配置

### 问题：私有 GitHub 仓库依赖

项目依赖于私有 GitHub 仓库：
```json
"@zsqk/z1-sdk": "github:zsqk/z1-mid-build#v2025.08.29-1506"
```

Vercel 构建环境需要访问这个私有仓库。

### 快速解决方案（推荐）

#### 步骤 1：生成 SSH 密钥（如果还没有）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
```

#### 步骤 2：添加公钥到 GitHub

1. 复制你的公钥：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. 访问 https://github.com/settings/keys

3. 点击 "New SSH key"

4. 粘贴公钥内容并保存

#### 步骤 3：在 Vercel 中配置环境变量

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)

2. 选择你的项目

3. 进入 **Settings** → **Environment Variables**

4. 添加以下环境变量：

   **变量 1：SSH_PRIVATE_KEY**
   - 值：你的私钥内容（运行 `cat ~/.ssh/id_ed25519`）
   - 应用到：Production, Preview, Development

   **变量 2：SSH_KNOWN_HOSTS**
   - 值：`github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6ZZJCpF8jO3+mWXvJaxzlHxwJnPEN`
   - 应用到：Production, Preview, Development

5. 保存环境变量

#### 步骤 4：重新部署

在 Vercel Dashboard 中点击 "Redeploy" 或推送新的提交到 GitHub。

### 自动化配置脚本

如果你想自动化上述步骤，可以运行：

```bash
bash scripts/setup-vercel-ssh.sh
```

这个脚本会：
1. 检查你是否有 SSH 密钥
2. 显示你的公钥
3. 提示你添加公钥到 GitHub
4. 显示需要在 Vercel 中配置的环境变量

### 本地开发

确保你的本地环境也能访问私有仓库：

```bash
# 如果使用 SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"

# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build
```

### 故障排除

#### 错误：`Permission denied (publickey)`

**原因**：SSH 密钥未正确配置

**解决方案**：
1. 检查公钥是否已添加到 GitHub：https://github.com/settings/keys
2. 确保私钥内容正确复制到 Vercel 环境变量
3. 验证 SSH 密钥权限：`ls -la ~/.ssh/id_ed25519` 应该显示 `600`

#### 错误：`Could not read from remote repository`

**原因**：仓库 URL 或权限问题

**解决方案**：
1. 确保你对私有仓库有访问权限
2. 检查仓库 URL 是否正确
3. 尝试在本地测试 SSH 连接：`ssh -T git@github.com`

#### 错误：`Identity file /vercel/.ssh/for-mid-deploy not accessible`

**原因**：Vercel 在寻找不存在的 SSH 密钥文件

**解决方案**：
1. 清除 Vercel 项目中的旧 SSH 配置
2. 按照上面的步骤重新配置环境变量
3. 重新部署

### 其他方案

#### 方案 A：使用 Vercel GitHub 集成

如果你的私有仓库在同一个 GitHub 账户下：

1. 在 Vercel Dashboard 中进入 **Settings** → **Git**
2. 确保已连接到 GitHub 账户
3. Vercel 会自动使用你的 GitHub 权限

#### 方案 B：使用 npm 私有注册表

如果 `@zsqk/z1-mid-build` 已发布到 npm 私有注册表：

1. 在 Vercel 中添加 `NPM_TOKEN` 环境变量
2. 更新 `.npmrc`：
   ```
   @zsqk:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

### 参考资源

- [Vercel 文档 - GitHub 集成](https://vercel.com/docs/concepts/git)
- [GitHub 文档 - SSH 密钥](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [npm 文档 - 私有包](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#private)
