# 标签页功能使用说明

## 功能概述

标签页功能已集成到主内容区域，位置固定在面包屑下方，不会随主内容区域滚动。用户可以：

- 打开多个页面标签
- 在标签之间快速切换
- 关闭单个标签
- 右键菜单：关闭、关闭其他、关闭所有
- 标签页会自动记录访问的页面

## 架构说明

### 1. TabsProvider (datahooks/tabs.tsx)
提供标签页状态管理的 Context，包含：
- `tabs`: 当前打开的所有标签页
- `activeKey`: 当前激活的标签页
- `addTab`: 添加新标签页
- `removeTab`: 移除标签页
- `setActiveTab`: 切换标签页
- `clearOtherTabs`: 关闭其他标签页
- `clearAllTabs`: 关闭所有可关闭的标签页

### 2. TabBar 组件 (components/Navigation/TabBar.tsx)
标签页的 UI 组件，特性：
- 固定在面包屑下方
- 支持鼠标点击切换
- 支持右键菜单操作
- 可关闭标签显示关闭按钮
- 标签过多时支持横向滚动

### 3. usePageTab Hook (datahooks/usePageTab.ts)
便捷的 Hook，用于在页面组件中自动注册标签页

## 在页面中使用

### 基本用法

在任何页面组件中，只需调用 `usePageTab` Hook：

```tsx
'use client';

import { usePageTab } from '../../datahooks/usePageTab';

export default function MyPage() {
  // 注册页面标签页
  usePageTab('我的页面');
  
  return (
    <div>
      {/* 页面内容 */}
    </div>
  );
}
```

### 设置不可关闭的标签页

某些重要页面（如首页）可以设置为不可关闭：

```tsx
export default function HomePage() {
  // 第二个参数设置为 false，表示不可关闭
  usePageTab('首页', false);
  
  return <div>首页内容</div>;
}
```

## 布局结构

```
┌─────────────────────────────────────────┐
│  TopNavbar (顶部导航 - 一级菜单)          │
├──────────┬──────────────────────────────┤
│          │  Breadcrumb (面包屑)          │
│ Sidebar  ├──────────────────────────────┤
│ (侧边栏  │  TabBar (标签页 - 固定)       │
│  二级    ├──────────────────────────────┤
│  菜单)   │                              │
│          │  Content (可滚动的内容区域)   │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

## 样式特点

- 标签页固定在面包屑下方，不随内容滚动
- 激活的标签页有蓝色高亮和底部边框
- 鼠标悬停时显示关闭按钮
- 支持右键菜单操作
- 标签过多时自动显示横向滚动条

## 示例页面

已在以下页面中添加了标签页功能：
- 租户管理页面 (`/tenant-manage`)

其他页面可以参考此示例添加 `usePageTab` Hook。
