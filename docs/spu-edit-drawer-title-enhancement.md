# SPU/SKU 编辑抽屉标题增强

## 更新内容

在 SPU 和 SKU 编辑抽屉的标题中显示正在编辑的产品名称，提升用户体验。

## 修改的文件

### 1. `app/spu-list/page.tsx` - SPU 列表页面

**修改内容**：

1. **添加状态**：
```typescript
const [editingSpuName, setEditingSpuName] = useState<string>('');
```

2. **更新 handleEdit 函数**：
```typescript
const handleEdit = (spuId: number) => {
  // 从列表中找到对应的 SPU 并获取名称
  const spu = list.find(item => item.id === spuId);
  if (spu) {
    setEditingSpuName(spu.name);
  }
  setEditingSpuID(spuId);
  setDrawerOpen(true);
};
```

3. **更新 handleCloseDrawer 函数**：
```typescript
const handleCloseDrawer = () => {
  setDrawerOpen(false);
  setEditingSpuID(undefined);
  setEditingSpuName(''); // 清空名称
};
```

4. **更新 Drawer 标题**：
```typescript
<Drawer
  title={editingSpuName ? `编辑 SPU - ${editingSpuName}` : '编辑 SPU'}
  // ... 其他属性
>
```

### 2. `app/spu-name-check/page.tsx` - SPU 名称检查页面

**修改内容**：与 `spu-list/page.tsx` 相同的修改。

### 3. `components/SPUEdit.tsx` - SPU 编辑组件（新增 SKU 编辑标题）

**修改内容**：

1. **添加导入**：
```typescript
import {
  editSPUInfo,
  getSPUInfo,
  getSKUsInfo,  // 新增
  invalidateSPUInfo,
} from '@zsqk/z1-sdk/es/z1p/product';
```

2. **添加状态**：
```typescript
const [selectedSkuName, setSelectedSkuName] = useState<string>('');
```

3. **更新 onWantEditSKU 回调**：
```typescript
onWantEditSKU={async (skuID) => {
  setSelectedSkuID(skuID);
  setShowSkuEditDrawer(true);
  
  // 异步获取 SKU 名称
  try {
    const skuInfo = await getSKUsInfo([skuID]);
    if (skuInfo && skuInfo.length > 0 && !('errInfo' in skuInfo[0])) {
      setSelectedSkuName(skuInfo[0].name);
    }
  } catch (error) {
    console.error('获取 SKU 名称失败:', error);
    // 降级方案：从 preData 中获取
    if (preData?.skuIDs) {
      const sku = preData.skuIDs.find((s: any) => s.skuID === skuID);
      if (sku && 'name' in sku) {
        setSelectedSkuName(sku.name as string);
      }
    }
  }
}}
```

4. **更新 SKU 编辑 Drawer**：
```typescript
<Drawer
  title={selectedSkuName ? `编辑 SKU - ${selectedSkuName}` : '编辑 SKU'}
  placement="right"
  onClose={() => {
    setShowSkuEditDrawer(false);
    setSelectedSkuID(undefined);
    setSelectedSkuName('');  // 清空名称
  }}
  open={showSkuEditDrawer}
  width="33.33%"
>
  <SKUEdit selectedSkuID={selectedSkuID} />
</Drawer>
```

## 效果

### SPU 编辑

**修改前**：
```
抽屉标题：编辑 SPU
```

**修改后**：
```
抽屉标题：编辑 SPU - 红米 15R 全网通5G版
```

### SKU 编辑

**修改前**：
```
抽屉标题：编辑 SKU
```

**修改后**：
```
抽屉标题：编辑 SKU - 红米 15R 全网通5G版 4GB+128GB 星岩黑
```

## 优点

1. **更清晰**：用户一眼就能看到正在编辑哪个 SPU/SKU
2. **更友好**：避免在多个产品之间切换时混淆
3. **更专业**：提升整体用户体验
4. **容错性强**：SKU 名称获取失败时有降级方案

## 技术细节

### SPU 编辑
- 利用现有的 list 数据，无需额外的 API 调用
- 在打开抽屉时从列表中查找对应的 SPU 名称
- 在关闭抽屉时清空名称状态

### SKU 编辑
- 通过 `getSKUsInfo` API 异步获取 SKU 完整名称
- 提供降级方案：如果 API 调用失败，尝试从 `preData.skuIDs` 中获取
- 使用条件渲染，如果名称不存在则显示默认标题

## 测试建议

### SPU 编辑测试
1. 打开 SPU 列表页面
2. 点击任意 SPU 的"编辑"按钮
3. 检查抽屉标题是否显示 SPU 名称
4. 关闭抽屉，再打开另一个 SPU
5. 检查标题是否正确更新

### SKU 编辑测试
1. 打开 SPU 编辑页面
2. 切换到"SKU编辑"标签
3. 点击任意 SKU 的"编辑"按钮
4. 检查抽屉标题是否显示 SKU 完整名称
5. 关闭抽屉，再打开另一个 SKU
6. 检查标题是否正确更新

## 相关页面

- `/spu-list` - SPU 列表页面
- `/spu-name-check` - SPU 名称检查页面
- SPU 编辑页面中的 SKU 编辑功能

