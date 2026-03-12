# 标签页功能实现说明

## 功能特性

已在主内容区域添加了标签页功能，具有以下特点：

✅ 标签页位置固定在面包屑下方，不会随主内容区域滚动
✅ 支持打开多个页面标签
✅ 支持标签之间快速切换
✅ 支持关闭单个标签（点击 X 按钮）
✅ 支持右键菜单操作：
  - 关闭当前标签
  - 关闭其他标签
  - 关闭所有标签
✅ 标签过多时自动显示横向滚动条
✅ 可设置某些标签为不可关闭（如首页）

## 实现架构

### 1. 核心文件

- `datahooks/tabs.tsx` - 标签页状态管理（Context + Provider）
- `datahooks/usePageTab.ts` - 便捷 Hook，用于页面注册标签
- `components/Navigation/TabBar.tsx` - 标签页 UI 组件
- `components/Layout/AdminLayout.tsx` - 集成标签页到布局
- `app/ClientLayout.tsx` - 添加 TabsProvider

### 2. 布局结构

```
┌─────────────────────────────────────────┐
│  TopNavbar (顶部导航 - 一级菜单)          │
├──────────┬──────────────────────────────┤
│          │  Breadcrumb (面包屑)          │
│ Sidebar  ├──────────────────────────────┤
│ (侧边栏  │  TabBar (标签页 - 固定)       │  ← 新增
│  二级    ├──────────────────────────────┤
│  菜单)   │                              │
│          │  Content (可滚动的内容区域)   │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 如何在页面中使用

### 基本用法

在任何页面组件中添加一行代码即可：

```tsx
'use client';

import { usePageTab } from '../../datahooks/usePageTab';

export default function MyPage() {
  // 注册页面标签页（可关闭）
  usePageTab('我的页面');
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

### 设置不可关闭的标签

对于重要页面（如首页、仪表盘），可以设置为不可关闭：

```tsx
export default function HomePage() {
  // 第二个参数设置为 false，表示不可关闭
  usePageTab('首页', false);
  
  return <div>首页内容</div>;
}
```

## 示例

已在以下页面中添加了标签页功能：

- ✅ 租户管理页面 (`app/tenant-manage/page.tsx`)

## 为其他页面添加标签页

只需在页面组件顶部添加两行代码：

```tsx
// 1. 导入 Hook
import { usePageTab } from '../../datahooks/usePageTab';

export default function YourPage() {
  // 2. 调用 Hook 注册标签页
  usePageTab('页面标题');
  
  // 其余代码保持不变
  return <div>...</div>;
}
```

## 技术细节

### TabsProvider 提供的功能

- `tabs`: TabItem[] - 当前打开的所有标签页
- `activeKey`: string - 当前激活的标签页 key
- `addTab(tab)` - 添加新标签页
- `removeTab(key)` - 移除指定标签页
- `setActiveTab(key)` - 切换到指定标签页
- `clearOtherTabs(key)` - 关闭除指定标签外的其他标签
- `clearAllTabs()` - 关闭所有可关闭的标签

### TabItem 数据结构

```typescript
interface TabItem {
  key: string;        // 唯一标识，通常使用路径
  label: string;      // 显示的标题
  path: string;       // 页面路径
  closable?: boolean; // 是否可关闭，默认 true
}
```

## 样式说明

- 激活的标签：蓝色背景 + 蓝色底部边框
- 未激活的标签：灰色文字，悬停时浅灰色背景
- 关闭按钮：仅在鼠标悬停时显示
- 标签栏：固定高度 40px，支持横向滚动

## 注意事项

1. 标签页会自动跟随路由变化
2. 关闭标签时，如果是当前激活的标签，会自动切换到相邻标签
3. 标签页状态在页面刷新后会重置（可以后续添加持久化功能）
4. 右键菜单操作会自动处理不可关闭的标签

## 后续优化建议

- [ ] 添加标签页拖拽排序功能
- [ ] 添加标签页持久化（localStorage）
- [ ] 添加标签页最大数量限制
- [ ] 添加标签页图标显示
- [ ] 添加标签页快捷键支持（Ctrl+Tab 切换等）
