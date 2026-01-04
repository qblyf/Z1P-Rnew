# 安全配置指南

## 敏感信息管理

本项目包含需要敏感配置的文件，这些文件不应该被提交到版本控制系统。

### 需要配置的文件

1. **z1clients.ts** - 租户配置文件
   - 包含数据库连接字符串
   - 包含 API 密钥和密钥
   - 包含第三方服务凭证

2. **constant/oss-config.ts** - OSS 配置文件
   - 包含阿里云 AccessKey

### 配置步骤

#### 1. 复制示例文件

```bash
# 复制租户配置示例
cp z1clients.example.ts z1clients.ts

# 复制 OSS 配置示例（如果需要）
cp constant/oss-config.example.ts constant/oss-config.ts
```

#### 2. 填入真实配置

编辑 `z1clients.ts` 和 `constant/oss-config.ts`，将占位符替换为实际的配置值。

#### 3. 使用环境变量（推荐）

为了更安全，建议使用环境变量来管理敏感信息：

```bash
# .env.local 或 .env.development.local
NEWGY_DB_URI=postgresql://user:password@host:port/database
NEWGY_OSS_ACCESS_KEY_ID=your_access_key_id
NEWGY_OSS_ACCESS_KEY_SECRET=your_access_key_secret
# ... 其他配置
```

然后在代码中使用：

```typescript
const config = {
  dbURI: process.env.NEWGY_DB_URI || '',
  oss: {
    accessKeyId: process.env.NEWGY_OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.NEWGY_OSS_ACCESS_KEY_SECRET || '',
  }
};
```

### .gitignore 配置

以下文件已被添加到 `.gitignore`，不会被提交到版本控制系统：

```
z1clients.ts
constant/oss-config.ts
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 安全最佳实践

1. **永远不要提交敏感信息** - 使用 `.gitignore` 排除敏感文件
2. **使用环境变量** - 在生产环境中使用环境变量管理敏感信息
3. **定期轮换密钥** - 定期更新 API 密钥和凭证
4. **使用密钥管理服务** - 考虑使用 AWS Secrets Manager、HashiCorp Vault 等服务
5. **审计日志** - 记录敏感信息的访问和使用

### 如果意外提交了敏感信息

如果不小心提交了敏感信息，请立即：

1. 撤销提交或修改历史
2. 轮换所有受影响的密钥和凭证
3. 通知相关团队成员

### 参考资源

- [GitHub - 管理敏感数据](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP - 敏感数据暴露](https://owasp.org/www-project-top-ten/)
