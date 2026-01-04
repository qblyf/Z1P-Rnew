# Z1 Platform React (Z1P-React)

目前部署的前端: `https://p.z1.pub`
目前部署的后端: `https://p-api.z1.pub`

当前项目包含部分后端.

## 部署

需要的环境变量:

- NEXT_PUBLIC_Z1P_ENDPOINT
- NEXT_PUBLIC_Z1P_DINGDING_CORPID
- NEXT_PUBLIC_HOST_URL

当前有自动部署, Vercel 关联本仓库 `z1p-release` 分支.

主要不要直接在 z1p-release 中进行提交, 而是需要部署时将主分支合并到 main.

在 Vercel 中下载依赖时的配置:

```sh
mkdir -p ~/.ssh && echo "$SSH_PRIVATE_KEY" > ~/.ssh/for-mid-deploy && chmod 600 ~/.ssh/for-mid-deploy && ssh-keyscan github.com >> ~/.ssh/known_hosts && GIT_SSH_COMMAND="ssh -i ~/.ssh/for-mid-deploy -o StrictHostKeyChecking=no" && npm ci
```

目前前端代码构建有问题, 需要手动构建. (by @iugo)

在确保本地 Git 增加临时远程仓库 temp 的前提下

`git remote add temp git@github.com:iugo/z1-temp.git || git remote set-url temp git@github.com:iugo/z1-temp.git`

执行下面命令强制构建发版:

`git push -f temp {当前本地分支}:main`

## 开发

调试命令: `npm run dev`

运行时所用到的环境变量在 `constants.ts` 文件内.

更新中间层:

```sh
# 更新到最新版本
npm install github:zsqk/z1-mid-build

# 更新到特定版本
npm install github:zsqk/z1-mid-build#v2024.07.01-1024
```

更新开发依赖:

`npm up eslint eslint-plugin-react eslint-plugin-react-hooks @next/eslint-plugin-next typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin @types/react`

## 商品管理规范

程序规范:

1. SPU 分类只能属于另外一个 SPU 分类或顶级.
2. 同级 SPU 分类 排序号不能重复. (确保有稳定且一致的顺序)
3. SPU 一定属于一个最末级 SPU 分类.
4. 一个 SKU 一定属于一个 SPU.
5. SPU 分类名称不能重复.
6. SPU 名称不能重复.
7. SKU 名称不能重复.
8. SKU 条形码 (GS1 条码, 69 码) 不能重复.
9. 一个 SPU 下要有相同规格设置的 SKU. 比如一个 SKU 有颜色, 则该 SPU 下的所有 SKU 均要有颜色.
10. 想要在 SPU 下创建 SKU, 必须要有 版本, 配置, 颜色, 至少其中一种.

数据运维规范 建议:

1. 不要用错别字. 比如应该是 iPhone, 而不是 IPhione.
2. 使用官方名称大小写, 比如应该是 iPhone, 而不是 iphone.
3. SPU 名称使用 品牌名 + 官方名称, 之间留空格.
4. SPU 名称不要有 全网通 字样.
5. 创建一个特定 SPU 分类, 只用于放丢弃的 SPU.
6. 创建一个特定 SPU 分类, 只用于放丢弃的 SPU 分类.
7. 如果想要新创建 SPU 分类, 可以去丢弃 SPU 分类中进行编辑, 而不是新增.
8. 如果创建了不存在的 SKU, 比如 SPU 下只有 3 个 SKU, 3 个 69 码, 但现在已经创建了 4 个.
   首先这是错误操作, 要避免. 如果发生, 只能丢弃掉整个 SPU, 其下 69 码后加 丢弃 字样即可.
