# 需要重新部署

## 问题
SKU 列表选择 SPU 后无法显示数据

## 原因
需要使用 `spuIDs` 参数让后端筛选 SKU，而不是前端筛选

## 解决方案
重新部署应用到生产环境

## 验证方法
部署后，在商品管理-SKU列表中：
1. 选择一个 SPU
2. 打开浏览器控制台，应该看到请求参数包含 `spuIDs`：
```
queryParams: {
  "limit": 5000,
  "offset": 0,
  "orderBy": { "key": "p.id", "sort": "DESC" },
  "states": ["valid"],
  "spuIDs": [106282]  ← 包含 spuIDs 参数
}
```
3. SKU 列表应该只显示该 SPU 的 SKU

## 已修复的提交
- c791bf0 - 修复SKU列表选择SPU后无法显示的问题（添加 spuID 字段）
- e0aa2e2 - 修复SKU列表选择SPU后的数据获取问题（使用 spuIDs 参数后端筛选）
