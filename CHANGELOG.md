# Changelog

所有重要变更都会记录在此文件中。


## 2026-02-13

### ⚠️ Breaking Change

- **密码哈希计算移至 Durable Object** — 解决 Workers 免费版 10ms CPU 超时问题
  - 新增 `PASSWORD_HASHER` Durable Object，scrypt 计算在 DO 中执行（30 秒 CPU 时间限制）
  - scrypt 参数恢复为 Better Auth 默认值（N=16384, r=16），安全性更高
  - **现有用户影响：** 已注册用户的密码哈希使用旧参数生成，无法通过新参数验证，需要通过「忘记密码」重置密码
  - 方式二部署用户迁移步骤：
    1. 参考 `wrangler.example.jsonc`，在 `wrangler.jsonc` 的 `durable_objects.bindings` 中添加 `PASSWORD_HASHER`
    2. 在 `migrations` 数组中添加 `{ "tag": "password-hasher-v1", "new_classes": ["PasswordHasher"] }`

## 2026-02-08

### 🛡️ Security

- **多层防护** — 防止认证接口被恶意滥用
  - Cloudflare Turnstile 人机验证
  - 按ip限流：密码重置和邮箱验证每ip 3 次/小时，超限静默跳过
  - POST `/api/auth/*` 速率限制从 10 次/分钟收紧至 5 次/分钟
  - 新增可选环境变量：`VITE_TURNSTILE_SITE_KEY`（构建时）
  - 新增可选环境变量：`TURNSTILE_SECRET_KEY`（运行时）
  - 未配置 Turnstile 时自动跳过验证，不影响现有功能

## 2026-02-07

### ✨ New Feature

- **友情链接** — 支持用户提交友链申请，管理员审核通过后展示
  - 用户提交友链后自动邮件通知管理员
  - 管理员审批/拒绝后邮件通知用户
  - 公开展示页面 `/friend-links`
  - 管理后台批量审核、编辑、删除

## 2026-02-06

### ⚠️ Breaking Change

- **邮件发送从 Workflow 迁移到 Queue**
  - 移除了 `SEND_EMAIL_WORKFLOW` binding
  - 新增 `QUEUE` binding，使用 Cloudflare Queues
  - 迁移步骤：
    1. 在 Cloudflare Dashboard → Queues 中创建 `blog-queue`
    2. 参考 `wrangler.example.jsonc` 更新你的 `wrangler.jsonc` 配置 `queues`
    3. 从 `wrangler.jsonc` 的 `workflows` 数组中移除 `send-email-workflow`
