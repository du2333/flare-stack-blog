# Flare Stack Blog

> 更新后部署失败？请查看 [CHANGELOG](./CHANGELOG.md) 了解 Breaking Changes。

> **注意**：本项目专为 Cloudflare Workers 生态设计，深度集成 D1、R2、KV、Workflows 等服务，**仅支持部署在 Cloudflare Workers**。

[部署指南](#部署指南) | [本地开发](#本地开发)

基于 Cloudflare Workers 的现代化全栈博客 CMS。

![首页](docs/assets/home.png)

![管理后台](docs/assets/admin.png)

## 核心功能

- **文章管理** — 富文本编辑器，支持代码高亮、图片上传、草稿/发布流程
- **标签系统** — 灵活的文章分类
- **评论系统** — 支持嵌套回复、邮件通知、审核机制
- **友情链接** — 用户申请、管理员审核、邮件通知
- **全文搜索** — 基于 Orama 的高性能搜索
- **媒体库** — R2 对象存储，图片管理与优化
- **用户认证** — GitHub OAuth 登录，权限控制
- **数据统计** — Umami 集成，访问分析与热门文章
- **AI 辅助** — Cloudflare Workers AI 集成

## 技术栈

### Cloudflare 生态

| 服务            | 用途                           |
| :-------------- | :----------------------------- |
| Workers         | 边缘计算与托管                 |
| D1              | SQLite 数据库                  |
| R2              | 对象存储（媒体文件）           |
| KV              | 缓存层                         |
| Durable Objects | 分布式限流                     |
| Workflows       | 异步任务（内容审核、定时发布） |
| Queues          | 消息队列（邮件通知）           |
| Workers AI      | AI 能力                        |
| Images          | 图片优化                       |

### 前端

- **框架**：React 19 + TanStack Router/Query
- **样式**：TailwindCSS 4
- **表单**：React Hook Form + Zod
- **图表**：Recharts

### 后端

- **网关层**：Hono（认证路由、媒体服务、缓存控制）
- **业务层**：TanStack Start（SSR、Server Functions）
- **数据库**：Drizzle ORM + drizzle-zod
- **认证**：Better Auth（GitHub OAuth）

### 编辑器

TipTap 富文本 + Shiki 代码高亮

### 目录结构

```
src/
├── features/
│   ├── posts/                  # 文章管理（其他模块结构类似）
│   │   ├── api/                # Server Functions（对外接口）
│   │   ├── data/               # 数据访问层（Drizzle 查询）
│   │   ├── posts.service.ts    # 业务逻辑
│   │   ├── posts.schema.ts     # Zod Schema + 缓存 Key 工厂
│   │   ├── components/         # 功能专属组件
│   │   ├── queries/            # TanStack Query Hooks
│   │   └── workflows/          # Cloudflare Workflows
│   ├── comments/    # 评论、嵌套回复、审核
│   ├── tags/        # 标签管理
│   ├── media/       # 媒体上传、R2 存储
│   ├── search/      # Orama 全文搜索
│   ├── auth/        # 认证、权限控制
│   ├── dashboard/   # 管理后台数据统计
│   ├── email/       # 邮件通知（Resend）
│   ├── cache/       # KV 缓存服务
│   ├── config/      # 博客配置
│   ├── friend-links/# 友情链接（申请、审核）
│   └── ai/          # Workers AI 集成
├── routes/
│   ├── _public/     # 公开页面（首页、文章列表/详情、搜索）
│   ├── _auth/       # 登录/注册相关页面
│   ├── _user/       # 用户相关页面
│   ├── admin/       # 管理后台（文章、评论、媒体、标签、设置）
│   ├── rss[.]xml.ts     # RSS Feed
│   ├── sitemap[.]xml.ts # Sitemap
│   └── robots[.]txt.ts  # Robots.txt
├── components/      # UI 组件（ui/, common/, layout/, tiptap-editor/）
├── lib/             # 基础设施（db/, auth/, hono/, middlewares）
└── hooks/           # 自定义 Hooks
```

### 请求流程

```
请求 → Cloudflare CDN（边缘缓存）
         ↓ 未命中
      server.ts（Hono 入口）
         ├── /api/auth/* → Better Auth
         ├── /images/*   → R2 媒体服务
         └── 其他        → TanStack Start
                              ↓
                         中间件注入（db, auth, session）
                              ↓
                         路由匹配 + Loader 执行
                              ↓
                  KV 缓存 ←→ Service 层 ←→ D1 数据库
                              ↓
                         SSR 渲染（带缓存头）
```

## 部署指南

> **推荐阅读**：[Flare Stack Blog 详细图文部署教程](https://blog.dukda.com/post/flare-stack-blog%E9%83%A8%E7%BD%B2%E6%95%99%E7%A8%8B) —— 包含所有凭证获取指引及常见问题排查。

本项目支持两种 CI/CD 部署方式，选择其一即可：

| 方式       | 平台                      | 免费额度     | 特点               |
| :--------- | :------------------------ | :----------- | :----------------- |
| **方式一** | GitHub Actions            | 2000 分钟/月 | 自动清除 CDN 缓存  |
| **方式二** | Cloudflare Workers Builds | 3000 分钟/月 | 无需创建部署 Token |

### 前置准备

以下步骤两种方式通用：

1. **Cloudflare 账号** — 需绑定付款方式以启用 R2、Workers AI、Images 等服务（免费额度充足，个人博客基本用不完）
2. **创建 Cloudflare 资源**：
   - R2 存储桶（记录名称）
   - D1 数据库（记录 Database ID）
   - KV 命名空间（记录 Namespace ID）
   - Queue 队列：`blog-queue`
3. **域名托管** — 将域名 DNS 托管到 Cloudflare 以使用免费 CDN
4. **获取 Cloudflare 凭证**：
   - Dashboard 中获取 Zone ID 和 Account ID
   - 创建 API Token（需要 Purge CDN 权限）
   - 创建 API Token（需要 Worker 部署 + D1 读写权限）— **仅方式一需要**
5. **GitHub OAuth App** — 在 GitHub Developer Settings 创建 OAuth App，获取 Client ID 和 Secret
   - Authorization callback URL：`https://<your-domain>/api/auth/callback/github`
6. **图片优化（可选）** — 在 Cloudflare Dashboard 中为你的域名开启 [Cloudflare Images](https://developers.cloudflare.com/images/)，每月 5000 次 unique transformations 免费额度
7. **邮件通知（可选）** — 注册 [Resend](https://resend.com) 并绑定域名，在博客后台「设置」页面配置 API Key。每月 3000 封免费额度。配置后可启用密码登录、验证码、回复通知、找回密码等功能

---

### 方式一：GitHub Actions 自动部署

> 使用 GitHub Actions CI/CD（每月 2000 分钟免费额度）。后续更新只需 Sync Fork 即可自动触发部署。

1. Fork 本仓库
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置变量
3. 进入 Actions 页面，手动触发 `Deploy` 工作流

CI/CD 会自动完成数据库迁移、构建、部署和 CDN 缓存清理。

#### GitHub Secrets（必填）

| 变量名                       | 类型   | 说明                                              |
| :--------------------------- | :----- | :------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`       | CI/CD  | Cloudflare API Token（Worker 部署 + D1 读写权限） |
| `CLOUDFLARE_ACCOUNT_ID`      | CI/CD  | Cloudflare Account ID                             |
| `D1_DATABASE_ID`             | CI/CD  | D1 数据库 ID                                      |
| `KV_NAMESPACE_ID`            | CI/CD  | KV 命名空间 ID                                    |
| `BUCKET_NAME`                | CI/CD  | R2 存储桶名称                                     |
| `BETTER_AUTH_SECRET`         | 运行时 | 会话加密密钥，运行 `openssl rand -hex 32` 生成    |
| `BETTER_AUTH_URL`            | 运行时 | 应用 URL（如 `https://blog.example.com`）         |
| `ADMIN_EMAIL`                | 运行时 | 管理员邮箱，注册的用户会按照该邮箱授予管理员权限  |
| `GH_CLIENT_ID`               | 运行时 | GitHub OAuth Client ID                            |
| `GH_CLIENT_SECRET`           | 运行时 | GitHub OAuth Client Secret                        |
| `CLOUDFLARE_ZONE_ID`         | 运行时 | Cloudflare Zone ID                                |
| `CLOUDFLARE_PURGE_API_TOKEN` | 运行时 | 具有 Purge CDN 权限的 API Token                   |
| `DOMAIN`                     | 运行时 | 博客域名（如 `blog.example.com`）                 |

> **类型说明**：
>
> - **CI/CD**：仅用于 GitHub Actions 构建部署，方式二用户无需配置
> - **运行时**：Worker 运行时使用，方式二用户在 Worker Settings 中配置

#### GitHub Secrets（可选，Umami 统计）

| 变量名           | 类型   | 说明                                 |
| :--------------- | :----- | :----------------------------------- |
| `UMAMI_SRC`      | 运行时 | Umami 基础 URL（见下方配置说明）     |
| `UMAMI_API_KEY`  | 运行时 | Umami Cloud API key（仅 Cloud 版本） |
| `UMAMI_USERNAME` | 运行时 | Umami 用户名（仅自部署版本）         |
| `UMAMI_PASSWORD` | 运行时 | Umami 密码（仅自部署版本）           |

##### Umami Cloud 配置示例：

```bash
UMAMI_SRC=https://cloud.umami.is
UMAMI_API_KEY=your-cloud-api-key
VITE_UMAMI_WEBSITE_ID=your-website-id
# 不需要设置 UMAMI_USERNAME 和 UMAMI_PASSWORD
```

##### 自部署 Umami 配置示例：

```bash
UMAMI_SRC=https://umami.yourdomain.com
UMAMI_USERNAME=your-username
UMAMI_PASSWORD=your-password
VITE_UMAMI_WEBSITE_ID=your-website-id
# 不需要设置 UMAMI_API_KEY
```

> **检测逻辑**：系统会自动检测 `UMAMI_API_KEY` 是否设置来判断使用 Cloud 还是自部署模式。

#### GitHub Variables（可选，客户端配置）

| 变量名                    | 类型   | 说明                          |
| :------------------------ | :----- | :---------------------------- |
| `VITE_TURNSTILE_SITE_KEY` | 构建时 | Cloudflare Turnstile 人机验证 |
| `VITE_UMAMI_WEBSITE_ID`   | 构建时 | Umami Website ID              |
| `VITE_BLOG_TITLE`         | 构建时 | 博客标题                      |
| `VITE_BLOG_NAME`          | 构建时 | 博客短名称，显示在导航栏上    |
| `VITE_BLOG_AUTHOR`        | 构建时 | 作者名称                      |
| `VITE_BLOG_DESCRIPTION`   | 构建时 | 博客描述，显示在主页上        |
| `VITE_BLOG_GITHUB`        | 构建时 | GitHub 主页链接               |
| `VITE_BLOG_EMAIL`         | 构建时 | 联系邮箱                      |

> **构建时变量**：在 Vite 构建时注入到客户端代码，方式二用户在 Build Variables 中配置

---

### 方式二：Cloudflare Dashboard 自动部署

> 使用 Cloudflare Workers Builds CI/CD（每月 3000 分钟免费额度）。后续更新 Sync Fork 后会自动触发部署，`wrangler.jsonc` 通常可自动合并无冲突。

1. Fork 本仓库
2. 复制 `wrangler.example.jsonc` 为 `wrangler.jsonc`，替换其中的占位符：

   ```jsonc
   {
     "routes": [{ "pattern": "blog.example.com", ... }],  // ← 你的域名
     "d1_databases": [{ "database_id": "xxxxxxxx-xxxx-...", ... }],  // ← D1 ID
     "r2_buckets": [{ "bucket_name": "my-blog-bucket", ... }],  // ← R2 存储桶名称
     "kv_namespaces": [{ "id": "xxxxxxxx...", ... }],  // ← KV ID
     "env": { "test": { ... } }  // ← 测试环境配置，无需修改
   }
   ```

3. 在 Cloudflare Dashboard 创建 Worker，连接你的 GitHub 仓库
4. 配置构建设置：
   - Build command: `bun run build`
   - Deploy command: `bun run deploy`
   - 构建时变量：`BUN_VERSION`: `1.3.5`
   - 构建时变量：所有 `VITE_*` 开头的客户端变量
5. 部署完成后，在 **Worker Settings → Variables and Secrets** 中配置运行时变量

> **注意**：运行时变量名与方式一略有不同：
>
> - `GH_CLIENT_ID` → `GITHUB_CLIENT_ID`
> - `GH_CLIENT_SECRET` → `GITHUB_CLIENT_SECRET`
>
> 其余变量名保持一致。Cloudflare 会自动创建带 D1 权限的 API Token，数据库迁移会在部署时自动执行。
>
> **CDN 缓存**：方式二不会自动清除 CDN 缓存，部署后可在博客后台「设置」页面手动清除。

---

## 本地开发

### 前置要求

- [Bun](https://bun.sh) >= 1.3
- Cloudflare 账号（用于远程 D1/R2/KV 资源）

### 快速开始

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env        # 客户端变量
cp .dev.vars.example .dev.vars  # 服务端变量

# 配置 Wrangler
cp wrangler.example.jsonc wrangler.jsonc
# 编辑 wrangler.jsonc，填入你的资源 ID

# 启动开发服务器
bun dev
```

### 常用命令

| 命令            | 说明                        |
| :-------------- | :-------------------------- |
| `bun dev`       | 启动开发服务器（端口 3000） |
| `bun run build` | 构建生产版本                |
| `bun run test`  | 运行测试                    |
| `bun lint`      | ESLint 检查                 |
| `bun check`     | 类型检查 + Lint + 格式化    |

### 数据库命令

| 命令              | 说明                                |
| :---------------- | :---------------------------------- |
| `bun db:studio`   | 启动 Drizzle Studio（可视化数据库） |
| `bun db:generate` | 生成迁移文件                        |
| `bun db:migrate`  | 应用迁移到远程 D1                   |

### 环境变量

| 文件        | 用途                                   |
| :---------- | :------------------------------------- |
| `.env`      | 客户端变量（`VITE_*`），Vite 读取      |
| `.dev.vars` | 服务端变量，Wrangler 注入 Worker `env` |

### 本地模拟 Cloudflare 资源

默认配置使用远程 D1/R2/KV 资源。如需完全本地开发，可在 `wrangler.jsonc` 中移除 `remote: true`，Miniflare 会自动模拟这些服务：

```jsonc
{
  "d1_databases": [{ "binding": "DB", ... }],  // 移除 "remote": true
  "r2_buckets": [{ "binding": "R2", ... }],    // 移除 "remote": true
  "kv_namespaces": [{ "binding": "KV", ... }]  // 移除 "remote": true
}
```

> **注意**：本地模拟的数据不会同步到远程，适合初期开发和测试。本地数据库迁移使用：
>
> ```bash
> wrangler d1 migrations apply DB
> ```
