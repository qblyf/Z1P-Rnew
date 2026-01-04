# Z1P 项目开发规范文档

欢迎来到 Z1P 后台管理系统的开发规范文档库。本文档集合为项目的现代化改造提供了完整的指导。

## 📚 文档导航

### 核心文档

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 项目架构概览
   - 项目结构
   - 技术栈
   - 核心流程
   - 关键组件

2. **[DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)** - 开发规范
   - 代码规范
   - 命名规范
   - TypeScript 规范
   - React 组件规范
   - 错误处理
   - 性能优化

3. **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)** - 设计系统
   - 色彩系统
   - 排版系统
   - 间距系统
   - 圆角系统
   - 阴影系统
   - 组件设计规范
   - 响应式设计

4. **[UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md)** - UI 组件库指南
   - 组件分类
   - 基础组件使用
   - 布局组件
   - 业务组件
   - 响应式设计
   - 主题定制

5. **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - 迁移指南
   - 从 Ant Design 迁移到 Tailwind CSS
   - 环境配置
   - 组件迁移示例
   - 页面迁移示例
   - 迁移检查清单

6. **[REFACTOR_PLAN.md](./REFACTOR_PLAN.md)** - 改造计划
   - 改造目标
   - 改造阶段
   - 具体任务
   - 时间表
   - 风险评估

## 🎯 快速开始

### 新开发者入门

1. 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解项目结构
2. 学习 [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) 的代码规范
3. 查看 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 的设计规范
4. 参考 [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md) 使用组件

### 参与迁移工作

1. 阅读 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 了解迁移方案
2. 按照 [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) 的计划执行
3. 遵循 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 的设计规范
4. 参考 [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md) 实现组件

## 🛠️ 技术栈

### 核心框架

- **Next.js 14.2.25** - React 框架
- **React 18.3.1** - UI 库
- **TypeScript 5.5.3** - 类型安全
- **Tailwind CSS 3.4.1** - 样式框架
- **Lucide React** - 图标库

### 状态管理

- **constate** - 全局状态管理
- **React Hooks** - 本地状态
- **SWR** - 数据获取

### 开发工具

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **TypeScript** - 类型检查

## 📋 项目结构

```
.kiro/
├── ARCHITECTURE.md          # 项目架构
├── DEVELOPMENT_STANDARDS.md # 开发规范
├── DESIGN_SYSTEM.md         # 设计系统
├── UI_COMPONENTS_GUIDE.md   # 组件指南
├── MIGRATION_GUIDE.md       # 迁移指南
├── REFACTOR_PLAN.md         # 改造计划
└── README.md                # 本文件

app/
├── layout.tsx               # 全局布局
├── page.tsx                 # 首页
└── [modules]/               # 功能模块

components/
├── layout/                  # 布局组件
├── common/                  # 通用组件
├── business/                # 业务组件
└── ui/                      # 基础 UI 组件

hooks/                       # 自定义 Hooks
services/                    # API 服务
types/                       # 类型定义
utils/                       # 工具函数
constants/                   # 常量定义
styles/                      # 全局样式
```

## 🎨 设计规范速查

### 色彩

- **主色**: 翠绿色 (#22c55e) + 青色 (#06b6d4)
- **成功**: 绿色 (#22c55e)
- **警告**: 琥珀色 (#f59e0b)
- **错误**: 红色 (#ef4444)
- **中性**: 灰色系 (Slate)

### 间距

- **xs**: 4px
- **sm**: 8px
- **md**: 16px (常用)
- **lg**: 24px (常用)
- **xl**: 32px

### 圆角

- **卡片**: rounded-xl (12px)
- **按钮**: rounded-lg (8px)
- **小组件**: rounded-md (6px)

### 阴影

- **卡片**: shadow-sm
- **悬停**: shadow-md
- **模态框**: shadow-lg

## 📖 常见任务

### 添加新页面

```bash
# 1. 在 app/ 下创建目录
mkdir app/new-feature

# 2. 创建 page.tsx
touch app/new-feature/page.tsx

# 3. 使用布局组件
# 参考 DESIGN_SYSTEM.md 的页面布局规范
```

### 创建新组件

```bash
# 1. 在 components/ 下创建文件
touch components/MyComponent.tsx

# 2. 编写组件
# 参考 DEVELOPMENT_STANDARDS.md 的组件规范

# 3. 导出类型定义
# 参考 DEVELOPMENT_STANDARDS.md 的 TypeScript 规范
```

### 添加新样式

```css
/* 在 app/globals.css 中添加 */
@layer components {
  .my-custom-class {
    @apply px-4 py-2 rounded-lg transition-all;
  }
}
```

### 使用图标

```typescript
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'

<Search size={20} className="text-slate-400" />
<Plus size={20} className="text-white" />
```

## ✅ 代码审查清单

在提交代码前，请检查：

- [ ] 遵循命名规范（文件、变量、函数）
- [ ] 添加了 TypeScript 类型定义
- [ ] 使用了正确的 Tailwind CSS 类
- [ ] 组件有适当的 JSDoc 注释
- [ ] 代码通过 ESLint 检查
- [ ] 响应式设计正确（mobile-first）
- [ ] 无障碍设计考虑（焦点、标签等）
- [ ] 性能优化（记忆化、代码分割等）
- [ ] 错误处理完善
- [ ] 测试覆盖充分

## 🚀 部署

### 开发环境

```bash
npm run dev
# 访问 http://localhost:3000
```

### 生产构建

```bash
npm run build
npm run start
```

### 代码检查

```bash
npm run lint
npm run typecheck
```

## 📞 常见问题

### Q: 如何自定义主题色？

A: 编辑 `tailwind.config.js` 中的 `theme.extend.colors`

### Q: 如何添加新的 Tailwind 类？

A: 在 `app/globals.css` 中使用 `@layer components` 添加

### Q: 如何处理响应式设计？

A: 使用 Tailwind 的响应式前缀：`sm:`, `md:`, `lg:`, `xl:`, `2xl:`

### Q: 如何优化性能？

A: 参考 [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md) 的性能优化部分

### Q: 如何处理暗色模式？

A: 使用 `dark:` 前缀，参考 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 的暗色模式部分

## 📚 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Lucide React 图标](https://lucide.dev/)
- [Headless UI](https://headlessui.com/)

## 🤝 贡献指南

### 提交代码

1. 创建功能分支：`git checkout -b feature/xxx`
2. 提交代码：`git commit -m "feat: 描述"`
3. 推送分支：`git push origin feature/xxx`
4. 创建 Pull Request

### 提交信息格式

```
feat: 添加新功能
fix: 修复 bug
refactor: 代码重构
docs: 文档更新
style: 样式调整
test: 测试更新
chore: 构建配置
```

## 📝 文档维护

这些文档需要定期更新：

- [ ] 每月审查一次设计规范
- [ ] 每周更新开发规范
- [ ] 发现新的最佳实践时更新
- [ ] 技术栈升级时更新

## 📞 联系方式

如有问题或建议，请：

1. 查看相关文档
2. 提交 Issue
3. 联系项目负责人

---

**最后更新**: 2025-01-01
**版本**: 1.0.0
**维护者**: Z1P 开发团队
