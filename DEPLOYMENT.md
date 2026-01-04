# 部署指南

## Vercel 部署配置

### 问题：私有 GitHub 仓库依赖

项目依赖于私有 GitHub 仓库：
```json
"@zsqk/z1-sdk": "github:zsqk/z1-mid-build#v2025.08.29-1506"
```

Vercel 构建环境需要访问这个私有仓库。

### 解决方案

#### 方案 1：使用 Vercel GitHub 集成（推荐）

1. 在 [Vercel Dashboard](https://vercel.com/dashboard) 中打开你的项目
2. 进入 **Settings** → **Git**
3. 确保已连接到 GitHub 账户
4. Vercel 会自动使用你的 GitHub 权限来访问私有仓库

#### 方案 2：配置 SSH 密钥（如果方案 1 不可行）

1. 生成 SSH 密钥对（如果还没有）：
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/vercel_deploy -N ""
   ```

2. 将公钥添加到 GitHub 账户：
   - 访问 https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴 `~/.ssh/vercel_deploy.pub` 的内容

3. 在 Vercel 项目设置中添加环境变量：
   - 进入 **Settings** → **Environment Variables**
   - 添加 `SSH_PRIVATE_KEY`，值为私钥内容（`~/.ssh/vercel_deploy`）
   - 添加 `SSH_KNOWN_HOSTS`，值为：
     ```
     github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6ZZJCpF8jO3+mWXvJaxzlHxwJnPEN
     ```

4. 在项目根目录创建 `vercel-build.sh`：
   ```bash
   #!/bin/bash
   
   # 配置 SSH
   mkdir -p ~/.ssh
   echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
   chmod 600 ~/.ssh/id_ed25519
   echo "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
   
   # 配置 git 使用 SSH
   git config --global url."git@github.com:".insteadOf "https://github.com/"
   
   # 安装依赖并构建
   npm install
   npm run build
   ```

5. 在 `vercel.json` 中配置：
   ```json
   {
     "buildCommand": "bash vercel-build.sh"
   }
   ```

#### 方案 3：使用 npm 私有注册表

如果 `@zsqk/z1-mid-build` 已发布到 npm 私有注册表：

1. 在 Vercel 项目设置中添加 `NPM_TOKEN` 环境变量
2. 更新 `.npmrc`：
   ```
   @zsqk:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NPM_TOKEN}
   ```

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

**错误：`Permission denied (publickey)`**
- 检查 SSH 密钥是否正确配置
- 确保公钥已添加到 GitHub 账户
- 验证 GitHub 账户对私有仓库有访问权限

**错误：`Could not read from remote repository`**
- 检查仓库 URL 是否正确
- 确保网络连接正常
- 验证 SSH 密钥权限（应为 600）

### 参考资源

- [Vercel 文档 - GitHub 集成](https://vercel.com/docs/concepts/git)
- [GitHub 文档 - SSH 密钥](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [npm 文档 - 私有包](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#private)
