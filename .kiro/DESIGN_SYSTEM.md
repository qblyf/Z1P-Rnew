# Z1P 设计系统

基于模版项目的现代化设计风格，建立统一的设计系统。

## 1. 色彩系统

### 1.1 主色系

```
翠绿色 (Emerald):
  - 50:  #f0fdf4
  - 100: #dcfce7
  - 200: #bbf7d0
  - 300: #86efac
  - 400: #4ade80
  - 500: #22c55e (主色)
  - 600: #16a34a
  - 700: #15803d
  - 800: #166534
  - 900: #145231

青色 (Cyan):
  - 50:  #ecf9ff
  - 100: #cff9ff
  - 200: #a5f3ff
  - 300: #67e8f9
  - 400: #22d3ee
  - 500: #06b6d4 (辅助色)
  - 600: #0891b2
  - 700: #0e7490
  - 800: #155e75
  - 900: #164e63
```

### 1.2 功能色

```
成功 (Green):     #22c55e
警告 (Amber):     #f59e0b
错误 (Red):       #ef4444
信息 (Blue):      #3b82f6
```

### 1.3 中性色

```
白色:           #ffffff
浅灰 (Slate):
  - 50:  #f8fafc
  - 100: #f1f5f9
  - 200: #e2e8f0
  - 300: #cbd5e1
  - 400: #94a3b8
  - 500: #64748b
  - 600: #475569
  - 700: #334155
  - 800: #1e293b
  - 900: #0f172a (深色)
```

### 1.4 渐变色

```
翠绿到青色:
  from-emerald-500 to-cyan-500

蓝色渐变:
  from-blue-500 to-blue-600

琥珀色渐变:
  from-amber-500 to-amber-600

玫瑰色渐变:
  from-rose-500 to-rose-600
```

## 2. 排版系统

### 2.1 字体

```
字体栈: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

### 2.2 字体大小

```
xs:  12px  (0.75rem)   - 小标签、辅助文本
sm:  14px  (0.875rem)  - 表格、列表
base: 16px (1rem)      - 正文、输入框
lg:  18px  (1.125rem)  - 小标题
xl:  20px  (1.25rem)   - 标题
2xl: 24px  (1.5rem)    - 大标题
3xl: 30px  (1.875rem)  - 页面标题
```

### 2.3 字体权重

```
normal:  400  - 正文
medium:  500  - 强调
semibold: 600 - 标题
bold:    700  - 重点
```

### 2.4 行高

```
tight:   1.25  - 标题
normal:  1.5   - 正文
relaxed: 1.625 - 描述
```

## 3. 间距系统

### 3.1 间距单位

```
0:   0px
1:   4px
2:   8px
3:   12px
4:   16px
6:   24px
8:   32px
12:  48px
16:  64px
```

### 3.2 常用间距

```
卡片内边距:     p-6 (24px)
卡片间距:       gap-6 (24px)
表格行高:       py-4 (16px)
表格列间距:     px-6 (24px)
按钮内边距:     px-4 py-2 (16px 8px)
输入框内边距:   px-4 py-2 (16px 8px)
```

## 4. 圆角系统

### 4.1 圆角半径

```
none:  0px
sm:    2px
base:  4px
md:    6px
lg:    8px
xl:    12px
2xl:   16px
full:  9999px (圆形)
```

### 4.2 应用规则

```
卡片、容器:     rounded-xl (12px)
按钮、输入框:   rounded-lg (8px)
小组件:         rounded-md (6px)
头像:           rounded-full (圆形)
```

## 5. 阴影系统

### 5.1 阴影等级

```
无阴影:    shadow-none
浅阴影:    shadow-sm    - 卡片默认
中阴影:    shadow-md    - 悬停状态
深阴影:    shadow-lg    - 模态框、下拉菜单
超深阴影:  shadow-xl    - 浮动操作
```

### 5.2 应用规则

```
卡片:       shadow-sm border border-slate-200
悬停卡片:   hover:shadow-md transition-shadow
模态框:     shadow-lg
下拉菜单:   shadow-lg
```

## 6. 组件设计规范

### 6.1 卡片 (Card)

#### 基础卡片

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
  <!-- 内容 -->
</div>
```

#### 卡片标题

```html
<div class="border-b border-slate-200 pb-4 mb-4">
  <h3 class="text-lg font-bold text-slate-800">标题</h3>
</div>
```

#### 悬停效果

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
  <!-- 内容 -->
</div>
```

### 6.2 按钮 (Button)

#### 主要按钮

```html
<button class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium">
  保存
</button>
```

#### 次要按钮

```html
<button class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
  取消
</button>
```

#### 危险按钮

```html
<button class="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium">
  删除
</button>
```

#### 文本按钮

```html
<button class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
  详情
</button>
```

#### 按钮大小

```
小:    px-3 py-1 text-sm
中:    px-4 py-2 text-base
大:    px-6 py-3 text-base
```

### 6.3 输入框 (Input)

#### 基础输入框

```html
<input
  type="text"
  placeholder="请输入..."
  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
/>
```

#### 带图标的输入框

```html
<div class="relative">
  <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
  <input
    type="text"
    placeholder="搜索..."
    class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
  />
</div>
```

#### 错误状态

```html
<input
  type="text"
  class="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
/>
<p class="mt-1 text-sm text-red-600">错误提示信息</p>
```

### 6.4 表格 (Table)

#### 表格结构

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead class="bg-slate-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
            列标题
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
            内容
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

#### 状态标签

```html
<!-- 成功 -->
<span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
  已完成
</span>

<!-- 处理中 -->
<span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
  处理中
</span>

<!-- 待处理 -->
<span class="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  待处理
</span>

<!-- 已取消 -->
<span class="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
  已取消
</span>
```

### 6.5 统计卡片 (Stat Card)

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
  <div class="flex items-start justify-between">
    <div>
      <p class="text-slate-600 text-sm font-medium">标题</p>
      <p class="text-3xl font-bold text-slate-800 mt-2">数值</p>
      <div class="flex items-center gap-1 mt-2">
        <ArrowUpRight size={16} class="text-green-600" />
        <span class="text-sm font-medium text-green-600">+12%</span>
        <span class="text-sm text-slate-500">本月</span>
      </div>
    </div>
    <div class="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
      <Icon size={24} class="text-white" />
    </div>
  </div>
</div>
```

## 7. 布局规范

### 7.1 页面布局

```
┌─────────────────────────────────────┐
│          Header (导航栏)             │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │    Main Content          │
│ (菜单)   │    (主要内容区)          │
│          │                          │
├──────────┴──────────────────────────┤
│          Footer (页脚)               │
└─────────────────────────────────────┘
```

### 7.2 响应式断点

```
xs:  0px      - 手机
sm:  640px    - 小平板
md:  768px    - 平板
lg:  1024px   - 小桌面
xl:  1280px   - 桌面
2xl: 1536px   - 大桌面
```

### 7.3 栅格系统

```
<!-- 响应式栅格 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <div>卡片 1</div>
  <div>卡片 2</div>
  <div>卡片 3</div>
  <div>卡片 4</div>
</div>
```

## 8. 动画和过渡

### 8.1 过渡效果

```
基础过渡:      transition-all
颜色过渡:      transition-colors
阴影过渡:      transition-shadow
不透明度过渡:  transition-opacity
```

### 8.2 过渡时间

```
快速:  duration-150
正常:  duration-300 (默认)
缓慢:  duration-500
```

### 8.3 常用过渡

```
<!-- 悬停效果 -->
<button class="hover:shadow-lg transition-shadow">
  按钮
</button>

<!-- 颜色变化 -->
<div class="hover:bg-slate-100 transition-colors">
  内容
</div>

<!-- 组合效果 -->
<div class="hover:shadow-md hover:scale-105 transition-all">
  卡片
</div>
```

## 9. 响应式设计规范

### 9.1 移动优先

```
<!-- 移动优先 -->
<div class="text-sm md:text-base lg:text-lg">
  文本
</div>

<!-- 隐藏/显示 -->
<div class="hidden md:block">
  仅在中等屏幕及以上显示
</div>

<div class="md:hidden">
  仅在小于中等屏幕显示
</div>
```

### 9.2 响应式表格

```
<!-- 小屏幕显示卡片，大屏幕显示表格 -->
<div class="hidden lg:block">
  <!-- 表格 -->
</div>

<div class="lg:hidden">
  <!-- 卡片列表 -->
</div>
```

## 10. 暗色模式（可选）

### 10.1 暗色色彩

```
背景:      bg-slate-900
卡片:      bg-slate-800
文本:      text-slate-100
边框:      border-slate-700
```

### 10.2 暗色模式类

```
<div class="dark:bg-slate-900 dark:text-slate-100">
  内容
</div>
```

## 11. 无障碍设计

### 11.1 焦点状态

```
<button class="focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
  按钮
</button>
```

### 11.2 颜色对比度

- 文本与背景对比度至少 4.5:1
- 大文本对比度至少 3:1

### 11.3 语义化

```
<!-- 使用语义化标签 -->
<button>按钮</button>
<a href="#">链接</a>
<input type="text" />
```

## 12. 性能优化

### 12.1 图片优化

```
<!-- 使用 Next.js Image -->
<Image
  src="/image.jpg"
  alt="描述"
  width={200}
  height={200}
  priority
/>
```

### 12.2 懒加载

```
<!-- 图片懒加载 -->
<img src="/image.jpg" loading="lazy" />
```

## 13. 常见组件组合

### 13.1 搜索栏 + 按钮

```html
<div class="flex flex-col sm:flex-row justify-between gap-4">
  <div class="relative flex-1 max-w-md">
    <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
    <input
      type="text"
      placeholder="搜索..."
      class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
    />
  </div>
  <button class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium">
    <PlusIcon size={20} />
    <span>添加</span>
  </button>
</div>
```

### 13.2 统计卡片网格

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <!-- 统计卡片 -->
</div>
```

### 13.3 表格容器

```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200">
  <div class="p-6 border-b border-slate-200">
    <h3 class="text-lg font-bold text-slate-800">表格标题</h3>
  </div>
  <div class="overflow-x-auto">
    <!-- 表格内容 -->
  </div>
</div>
```

## 14. 参考资源

- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Lucide React 图标](https://lucide.dev/)
- [Tailwind UI 组件](https://tailwindui.com/)
- [Headless UI](https://headlessui.com/)
