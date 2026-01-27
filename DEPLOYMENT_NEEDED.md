# 需要重新部署

## 问题
SKU 列表选择 SPU 后无法显示数据

## 原因
生产环境运行的是旧版本代码，缺少 `spuID` 字段的请求

## 解决方案
重新部署应用到生产环境

## 验证方法
部署后，打开浏览器控制台，应该看到：
```
fields: {
  "sku": ["id", "name", "state", "spuID"],  ← 包含 spuID
  "spu": ["brand"]
}
```

而不是当前的：
```
fields: {
  "sku": ["id", "name", "state"],  ← 缺少 spuID
  "spu": ["brand"]
}
```

## 已修复的提交
- c791bf0 - 修复SKU列表选择SPU后无法显示的问题
