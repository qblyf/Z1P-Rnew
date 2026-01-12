# 开发规则

本文档定义了项目的编码规范和开发要求。所有开发人员必须遵守这些规则。

## TypeScript 类型安全

### 禁止使用 `any` 类型

**规则：** 严禁在代码中使用 `any` 类型。

**原因：**
- `any` 类型会绕过 TypeScript 的类型检查，降低代码安全性
- 容易引入运行时错误
- 影响代码的可维护性和可读性

**正确做法：**

❌ **错误示例：**
```typescript
const patch: SomeType = rest as any;
const name = (patch as any).name;
const spell = (preData as any).spell;
setPreData(update(preData, {...}) as any);
```

✅ **正确示例：**
```typescript
// 使用正确的类型注解
const patch: Awaited<Parameters<typeof editSKUInfo>[1]> = rest as Awaited<Parameters<typeof editSKUInfo>[1]>;

// 直接使用已定义的类型
const name = patch.name;
const spell = preData.spell;

// 不需要类型断言
setPreData(update(preData, {...}));
```

**替代方案：**
1. 使用具体的类型定义
2. 使用类型推断
3. 使用 `unknown` 类型（如果必须）并进行类型守卫
4. 定义接口或类型别名

**检查方法：**
- 在 ESLint 配置中启用 `@typescript-eslint/no-explicit-any` 规则
- 代码审查时检查是否有 `as any` 或 `: any` 的使用

---

## 代码审查检查清单

提交代码前，请确保：
- [ ] 没有使用 `any` 类型
- [ ] 所有类型都有明确的定义
- [ ] 代码通过 TypeScript 编译检查
- [ ] 代码通过 ESLint 检查

---

## 相关配置

### ESLint 规则
```json
{
  "@typescript-eslint/no-explicit-any": "error"
}
```

### TypeScript 编译选项
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strict": true
  }
}
```
