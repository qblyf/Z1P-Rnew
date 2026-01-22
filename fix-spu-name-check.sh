#!/bin/bash

# 备份原文件
cp app/spu-name-check/page.tsx app/spu-name-check/page.tsx.original

# 1. 添加 useBrandListContext 导入
sed -i '' 's/import { BrandListProvider } from/import { BrandListProvider, useBrandListContext } from/' app/spu-name-check/page.tsx

# 2. 添加 Input 导入
sed -i '' 's/Divider } from/Divider, Input } from/' app/spu-name-check/page.tsx

# 3. 删除 BatchChangeBrandModal 组件（从 "批量修改品牌的 Modal" 注释开始到下一个 "/**" 之前）
# 使用 perl 进行多行删除
perl -i -0pe 's/\/\*\*\n \* \[组件\] 批量修改品牌的 Modal.*?\n}\n\n(?=\/\*\*)//s' app/spu-name-check/page.tsx

# 4. 移除 PageHeader 中的批量修改品牌按钮
perl -i -0pe 's/extra=\{\[\n.*?<Button\n.*?key="batch-brand".*?\n.*?<\/Button>,\n.*?\]\}//' app/spu-name-check/page.tsx

# 5. 移除 batchBrandModalVisible 状态
sed -i '' '/batchBrandModalVisible, setBatchBrandModalVisible/d' app/spu-name-check/page.tsx

# 6. 在主组件中添加 rowSelection 定义（在 handleCloseDrawer 之后）
# 这需要找到合适的位置插入

# 7. 替换文件末尾的 BatchChangeBrandModal 为 BatchEditModal
sed -i '' 's/BatchChangeBrandModal/BatchEditModal/g' app/spu-name-check/page.tsx
sed -i '' 's/batchBrandModalVisible/batchEditVisible/g' app/spu-name-check/page.tsx
sed -i '' 's/setBatchBrandModalVisible/setBatchEditVisible/g' app/spu-name-check/page.tsx
sed -i '' 's/allBrands={allBrands}/selectedIds={selectedRowKeys as number[]}\n          cates={cates}/g' app/spu-name-check/page.tsx

# 8. 在表格中添加 rowSelection
sed -i '' '/loading={loading}/a\
                    rowSelection={rowSelection}
' app/spu-name-check/page.tsx

echo "修改完成！请检查文件并测试功能。"
