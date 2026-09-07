<div align="center">

<img src="docs/assets/flare-stack-blog-logo.png" alt="Flare Stack Blog Logo" width="144">

# Flare Stack Blog

基于 **Cloudflare 边缘生态**打造的高性能全栈博客与 CMS 系统<br>
利用 Workers、D1、R2、KV 与 Queues 实现真正的全 Serverless 架构

[![License](https://img.shields.io/github/license/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/du2333/flare-stack-blog?style=flat-square)](https://github.com/du2333/flare-stack-blog/network/members)
[![React](https://img.shields.io/badge/React-19-blue?logo=react&style=flat-square)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-black?logo=tanstack&style=flat-square)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css&style=flat-square)](https://tailwindcss.com)

[在线演示](https://blog.dukda.com) · [部署指南](#部署指南) · [本地开发](#本地开发) · [贡献指南](./CONTRIBUTING.md) · [交流群组](https://t.me/+vWuQYybv1kgxMDkx)

</div>

---

Flare Stack Blog 是一个深度拥抱 Cloudflare 生态的开源独立博客系统。前端基于 React 19 和 TanStack 现代全栈框架构建，界面承袭清新简约的 [Fuwari](https://github.com/saicaca/fuwari) 视觉风格；后端完全运行于 Cloudflare Workers 边缘网络，搭配 D1、R2、KV 与异步队列，无需传统服务器即可享受极速的全球访问体验与近乎零成本的运维。

> [!NOTE]
> 本项目专为 Cloudflare Workers 边缘运行时设计。

## 界面预览

<div align="center">
  <img src="docs/assets/home.png" alt="首页预览" width="49%">
  <img src="docs/assets/admin.png" alt="管理后台预览" width="49%">
</div>

## 功能特性

- 📝 **创作与内容管理**
  - **现代化富文本编辑器**：基于 TipTap 与 Shiki，原生支持代码语法高亮、数学公式排版、多尺寸媒体插入与文章封面。
  - **版本快照与历史回滚**：发布文章时自动归档快照，可随时按发布时间比对差异并一键恢复至任意历史版本。
  - **分类与标签体系**：支持文章单分类与多标签灵活组合筛选。
  - **站内实时全文检索**：用 Cloudflare D1 FTS 索引已发布文章的标题、摘要、分类、标签与正文。

- 💬 **互动与读者体验**
  - **评论与社区互动**：支持嵌套层级回复、访客防刷保护、评论软删除与违规用户禁言管理。
  - **友情链接流转**：前台提供规范的申请表单，后台支持一键审核通过、驳回反馈与邮件即时联动。
  - **国际化多语言**：公开阅读界面与管理后台均完整支持中英文无缝切换。

- ⚡ **边缘基础设施**
  - **全 Serverless 存储栈**：以 Cloudflare D1 作为主关系型数据库，KV 承担高频缓存，Durable Objects 负责精准访问限流。
  - **全球静态资产加速**：媒体文件直存 R2 存储桶，配合 Cloudflare Image Resizing 实现实时图片缩放与格式优化。
  - **异步队列事件解耦**：通知邮件发送与 Webhook 派发经由 Cloudflare Queues 异步队列处理，接口响应零阻塞。

- 🛠️ **系统与扩展能力**
  - **安全身份认证**：集成 Better Auth，原生支持邮箱密码账号体系与 GitHub OAuth 快捷登录。
  - **开放 API 接口**：支持在后台签发 API Key，通过规范化 OpenAPI / oRPC 接口无缝对接第三方自动化工具或发布脚本。
  - **访问分析与 SEO**：内建 Umami 统计与文章热度自动同步，开箱支持 Canonical、Schema.org、RSS / Atom / JSON Feed、Sitemap 与 Robots 标准。

## 技术栈

| 模块 | 选型 | 说明 |
| :--- | :--- | :--- |
| **边缘运行时** | Cloudflare Workers | 全球边缘免运维托管与服务端流式渲染（SSR） |
| **数据与存储** | Cloudflare D1 + R2 + KV | 关系型数据库（含全文检索）、对象存储与边缘键值缓存 |
| **异步与限流** | Cloudflare Queues + DO | 异步任务解耦队列与 Durable Objects 请求限流 |
| **全栈框架** | TanStack Start + Router + Query | 现代全栈路由系统、服务端数据预取与水合 |
| **前端技术** | React 19 + Tailwind CSS 4 | 现代化组件开发与主题样式系统 |
| **API 与 ORM** | oRPC + Drizzle ORM | 端到端类型安全的 OpenAPI 接口与 SQL ORM |
| **身份认证** | Better Auth | 边缘兼容的现代化身份验证服务 |
| **富文本** | TipTap + Shiki | 可扩展的所见即所得编辑器与代码高亮引擎 |

## 部署指南

推荐使用 **Cloudflare Workers Builds**（连接 GitHub 仓库自动持续部署）。

### 第一步：准备 Cloudflare 资源

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，在你的账号下预先创建以下资源（名称自定）：

1. **Workers**：新建一个 Worker（记下名称，如 `my-blog`）。
2. **D1 数据库**：新建一个 D1 Database（记下 `Database ID`）。
3. **KV 命名空间**：新建一个 KV Namespace（记下 `Namespace ID`）。
4. **R2 存储桶**：新建一个 R2 Bucket（记下 `Bucket Name`）。
5. **Queues 队列**：新建一个 Queue（记下 `Queue Name`）。

### 第二步：配置构建设置

1. Fork 本仓库至你的 GitHub 账号。
2. 在 Cloudflare Worker 的管理面板中，绑定你的 Fork 仓库并选择要自动部署的生产分支。
3. 在构建设置中填入以下构建与部署指令：
   - **Build command**：`bun run wrangler:prepare && bun run build`
   - **Deploy command**：`bun run deploy`
   - *(可选)* 若系统构建镜像默认的 Bun 版本较低，可添加构建变量 `BUN_VERSION=1.3.0`。

> [!TIP]
> `wrangler.jsonc` 会在构建期间由 `bun run wrangler:prepare` 脚本依据环境变量自动生成，请**不要**将包含真实资源 ID 的 `wrangler.jsonc` 提交至公开 Git 仓库中。

### 第三步：配置环境变量与机密

环境变量分为**构建变量（Build Variables）**与**运行时变量/机密（Runtime Variables & Secrets）**。

#### 1. 构建变量（Build Variables）
在 Worker 的 **Builds** 设置中配置，供代码构建期与 `wrangler:prepare` 生成配置使用：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `WORKER_NAME` | 是 | 必须与第一步创建的 Worker 名称完全一致 |
| `QUEUE_NAME` | 是 | 必须与第一步创建的 Queue 名称完全一致 |
| `DOMAIN` | 是 | 站点绑定的主机域名（如 `blog.example.com`） |
| `D1_DATABASE_ID` | 是 | 第一步创建的 D1 数据库 ID |
| `KV_NAMESPACE_ID` | 是 | 第一步创建的 KV 命名空间 ID |
| `BUCKET_NAME` | 是 | 第一步创建的 R2 存储桶名称 |
| `ROUTE` | 否 | 域名绑定模式。默认使用 Custom Domain；设为 `1` 时切换为 Workers Routes 模式（`DOMAIN/*`） |
| `ZONE_NAME` | 否 | 配合 `ROUTE` 使用的 Cloudflare 区域根域名（如 `example.com`）；省略时自动从 `DOMAIN` 推导 |
| `VITE_TURNSTILE_SITE_KEY` | 否 | Cloudflare Turnstile 人机验证站点公钥（Site Key） |
| `VITE_UMAMI_WEBSITE_ID` | 否 | Umami 统计公开脚本埋点使用的 Website ID |

> [!TIP]
> **关于域名绑定模式**：默认使用 Cloudflare **Custom Domain**（由 Cloudflare 自动创建与维护 DNS 记录，简单可靠）。如果你的域名已在 Cloudflare 配置了 DNS 橙色云朵代理并希望通过路由规则接管流量，可配置 `ROUTE=1` 启用 **Workers Routes** 模式。

#### 2. 运行时变量与机密（Runtime Variables & Secrets）
在 Worker 的 **Settings → Variables and Secrets** 中配置（密钥信息建议勾选 Encrypt 设为机密）：

| 变量名 | 必填 | 说明 |
| :--- | :---: | :--- |
| `BETTER_AUTH_SECRET` | 是 | 身份认证加密密钥，可本地执行 `openssl rand -hex 32` 生成 |
| `BETTER_AUTH_URL` | 是 | 完整的公开站点访问地址（如 `https://blog.example.com`） |
| `DOMAIN` | 是 | 站点主机名（如 `blog.example.com`） |
| `GITHUB_CLIENT_ID` | 是 | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | 是 | GitHub OAuth App 的 Client Secret |
| `TURNSTILE_SECRET_KEY` | 否 | Cloudflare Turnstile 服务端通信私钥 |
| `UMAMI_WEBSITE_ID` | 否 | Umami 统计站点 ID（需与构建变量中的 ID 一致） |
| `UMAMI_SRC` | 否 | Umami 脚本服务源（如 `https://cloud.umami.is`） |
| `UMAMI_API_KEY` | 否 | Umami Cloud API 密钥（与账号密码二选一） |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | 否 | 自建 Umami 实例的管理账号与密码 |
| `GITHUB_TOKEN` | 否 | GitHub Personal Access Token，避免边缘节点共享 IP 触发 GitHub API 速率限制 |
| `ENVIRONMENT` | 否 | 环境标识，生产环境切勿填写为 `dev` |

> [!NOTE]
> 申请 GitHub OAuth App 时，授权回调地址（Authorization callback URL）请统一填写为：  
> `https://<你的域名>/api/auth/callback/github`

### 第四步：触发部署与初始化管理员

1. 提交或手动触发一次 Cloudflare 构建，部署脚本会自动应用 D1 数据库最新迁移并上线 Worker。
2. 浏览器访问你的域名，点击右上角进入注册页面。
3. **系统创建的第一个账号会自动获得最高管理员权限**，登录后即可进入 `/admin` 仪表盘开启个性化配置与文章撰写。

## 本地开发

开发环境要求：[Bun](https://bun.sh) >= 1.3。

### 1. 安装依赖与初始化配置

```bash
# 克隆仓库并安装依赖
git clone https://github.com/du2333/flare-stack-blog.git
cd flare-stack-blog
bun install

# 复制本地配置文件模板
cp .env.example .env
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

参考 `.env` 与 `.dev.vars` 中的注释完成基础项配置。本地开发通过 Miniflare 本地模拟 D1、KV 和 R2 存储服务，`wrangler.jsonc` 可直接使用模板占位符启动。

### 2. 启动本地开发服务

```bash
bun dev
```

在浏览器中打开 `http://localhost:3000` 即可开始预览。

> [!TIP]
> - 本地开发模式下，注册账号不会真实投递外部邮件，验证链接会直接打印在终端控制台中，点击即可完成激活。
> - 本地首个注册的账号同样会自动赋予管理员权限。

### 常用开发脚本

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动本地开发服务（默认监听端口 3000） |
| `bun check` | 提交前综合检查（包含 OpenAPI 合约生成、代码格式校验、Lint 与 TypeScript 类型检查） |
| `bun test` | 执行全量集成与单元测试套件 |
| `bun db:migrate:local` | 对本地模拟数据库应用 D1 数据库迁移 |
| `bun db:studio` | 启动本地 Drizzle Studio 可视化数据库管理界面 |
| `bun i18n:verify` | 检查并校验多语言词条键值完整性（zh / en 一致性） |
| `bun i18n:compile` | 重新编译并生成 Paraglide 多语言运行时产物 |

## 参与贡献

非常欢迎任何形式的贡献！无论是新功能提议、代码重构还是文档润色，都可以先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解我们的协作流程。

欢迎加入我们的 [Telegram 交流群](https://t.me/+vWuQYybv1kgxMDkx) 与其他开发者一起交流探讨。

## 致谢

- **[Fuwari](https://github.com/saicaca/fuwari)**：本项目优雅清新的界面与动效设计灵感源自 [@saicaca](https://github.com/saicaca) 优秀的开源博客主题。

## 开源协议

本项目采用 [GPL-3.0](https://github.com/du2333/flare-stack-blog/blob/main/LICENSE) 协议开源。
