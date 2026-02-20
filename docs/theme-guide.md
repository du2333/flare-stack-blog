# 主题开发指南

本文介绍如何为 Flare Stack Blog 创建自定义主题。

## 概览

Flare Stack Blog 的主题系统基于**契约（Contract）与实现（Implementation）分离**的设计思路：

- **契约层**（`src/features/theme/contract/`）：由框架定义，描述每个页面和布局组件的 Props 接口。业务逻辑、路由、数据获取全部在这一侧，与主题无关。
- **实现层**（`src/features/theme/themes/<your-theme>/`）：由主题开发者实现，只负责渲染 UI，不感知任何后端细节。

路由层通过 `import theme from "@theme"` 引用当前激活的主题，`@theme` 是一个编译时别名，指向构建时选定的主题目录。两侧以 TypeScript 接口为边界，编译器会在你忘记实现某个组件时立即报错。

```
vite.config.ts
  THEME=my-theme  →  @theme  →  src/features/theme/themes/my-theme/index.ts
```

## 主题契约

契约定义在三个文件中，你在开发主题时只需**读取**这些类型，无需修改它们。

### `contract/components.ts` — 组件清单

`ThemeComponents` 接口列出了主题必须导出的所有组件。你的 `index.ts` 必须满足这个接口：

| 字段                                          | 说明                           |
| :-------------------------------------------- | :----------------------------- |
| `PublicLayout`                                | 公共布局（含 Navbar / Footer） |
| `AuthLayout`                                  | 认证页布局                     |
| `UserLayout`                                  | 登录用户专属布局               |
| `HomePage` / `HomePageSkeleton`               | 首页及其加载骨架屏             |
| `PostsPage` / `PostsPageSkeleton`             | 文章列表页及骨架屏             |
| `PostPage` / `PostPageSkeleton`               | 文章详情页及骨架屏             |
| `FriendLinksPage` / `FriendLinksPageSkeleton` | 友链列表页及骨架屏             |
| `SearchPage`                                  | 搜索页                         |
| `SubmitFriendLinkPage`                        | 友链提交页                     |
| `LoginPage`                                   | 登录页                         |
| `RegisterPage`                                | 注册页                         |
| `ForgotPasswordPage`                          | 找回密码页                     |
| `ResetPasswordPage`                           | 重置密码页                     |
| `VerifyEmailPage`                             | 邮箱验证页                     |
| `ProfilePage`                                 | 个人资料页                     |

> **骨架屏（Skeleton）**：用作 TanStack Router 的 `pendingComponent`，在页面数据请求期间展示的过渡 UI。主题可以根据自身的交互设计语言自行决定是否需要实现它（例如，为了配合某些入场动画，您可以选择直接返回 `null` 而不渲染占位图）。

### `contract/layouts.ts` — 布局 Props

```ts
interface PublicLayoutProps {
  children: React.ReactNode;
  navOptions: Array<{ label: string; to: string; id: string }>;
  user?: { name: string; image?: string | null; role?: string | null };
  isSessionLoading: boolean;
  logout: () => Promise<void>;
}

interface AuthLayoutProps {
  onBack: () => void;
  children: React.ReactNode;
}

interface UserLayoutProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}
```

### `contract/pages/` — 各页面 Props

每个页面对应一个独立文件，例如：

```ts
// contract/pages/home.ts
interface HomePageProps {
  posts: Array<PostItem>;
}

// contract/pages/posts.ts
interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}
```

完整的类型定义请直接查阅 [`src/features/theme/contract/pages/`](../src/features/theme/contract/pages/) 目录。

## 推荐目录结构

参考默认主题（`themes/default/`），建议的目录布局如下：

```
src/features/theme/themes/<your-theme>/
├── index.ts                  # 主题入口，导出满足 ThemeComponents 的对象
├── styles/
│   └── index.css             # 主题私有样式（颜色变量、字体、排版等）
├── layouts/
│   ├── public-layout.tsx
│   ├── auth-layout.tsx
│   ├── user-layout.tsx
│   ├── navbar.tsx            # PublicLayout 的内部子组件
│   ├── footer.tsx
│   └── mobile-menu.tsx
├── pages/
│   ├── home/
│   │   ├── page.tsx          # HomePage 组件
│   │   └── skeleton.tsx      # HomePageSkeleton（可选）
│   ├── posts/
│   ├── post/
│   ├── search/
│   ├── friend-links/
│   ├── submit-friend-link/
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   └── user/
│       └── profile/
├── components/               # 主题内部共享组件（可选）
│   ├── content/              # 内容渲染组件（文章正文）
│   │   ├── render.tsx        # Tiptap AST → React 映射
│   │   ├── content-renderer.tsx # 包装层
│   │   ├── code-block.tsx    # 代码块渲染
│   │   ├── image-display.tsx # 图片展示
│   │   └── zoomable-image.tsx # 图片灯箱
│   └── comments/             # 评论区组件（可选，可复用共享组件）
│       ├── view/             # 评论展示
│       └── editor/           # 评论编辑器
└── config.ts                 # 主题静态配置
```

## Step-by-step：创建第一个主题

### 快速开始：使用脚手架脚本

运行以下命令，按提示输入主题名称（如 `my-theme`），即可在 `src/features/theme/themes/` 下生成完整的主题目录和满足契约的 placeholder 组件：

```bash
bun run create-theme
```

脚本会创建所有必需的布局、页面和骨架屏文件，组件实现为占位符，方便你在此基础上逐步替换为真实 UI。完成后按提示：

1. 在 `vite.config.ts` 的 `z.enum(["default"])` 中加入新主题名
2. 在 `.env` 中设置 `THEME=<your-theme>` 并启动开发

---

### 手动创建：Step 1 — 创建主题目录

若希望从零开始，可手动创建目录：

```bash
mkdir -p src/features/theme/themes/my-theme/layouts
mkdir -p src/features/theme/themes/my-theme/pages
```

### Step 2：实现布局组件

创建 `layouts/public-layout.tsx`，接收 `PublicLayoutProps`：

```tsx
import type { PublicLayoutProps } from "@/features/theme/contract/layouts";

export function PublicLayout({
  children,
  navOptions,
  user,
  isSessionLoading,
  logout,
}: PublicLayoutProps) {
  return (
    <div>
      <nav>
        {navOptions.map((opt) => (
          <a key={opt.id} href={opt.to}>
            {opt.label}
          </a>
        ))}
        {user && <button onClick={logout}>退出</button>}
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

同理创建 `layouts/auth-layout.tsx` 和 `layouts/user-layout.tsx`。

### Step 3：实现页面组件

每个页面从 contract 中导入对应的 Props 类型：

```tsx
// pages/home/page.tsx
import type { HomePageProps } from "@/features/theme/contract/pages";

export function HomePage({ posts }: HomePageProps) {
  return (
    <div>
      <h1>最新文章</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}

// 骨架屏（数据加载期间展示）
export function HomePageSkeleton() {
  return <div>加载中...</div>;
}
```

### Step 4：创建 `index.ts`

主题入口文件必须默认导出一个满足 `ThemeComponents` 的对象，使用 `satisfies` 关键字让 TypeScript 在编译时验证完整性：

```ts
// src/features/theme/themes/my-theme/index.ts
import type { ThemeComponents } from "@/features/theme/contract/components";
import { PublicLayout } from "./layouts/public-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { UserLayout } from "./layouts/user-layout";
import { HomePage, HomePageSkeleton } from "./pages/home/page";
// ... 其余 import

export default {
  PublicLayout,
  AuthLayout,
  UserLayout,
  HomePage,
  HomePageSkeleton,
  // ... 其余组件
} satisfies ThemeComponents;
```

如果遗漏了任何必须的组件，TypeScript 会在此处报错，明确指出缺少哪个字段。

### Step 5：注册主题并启动

打开 `vite.config.ts`，在 `buildEnvSchema` 中将你的主题名加入枚举：

```ts
// vite.config.ts
const buildEnvSchema = z.object({
  // 在此处添加新主题名称
  THEME: z.enum(["default", "my-theme"]).default("default"),
});
```

然后通过 `THEME` 环境变量在构建和开发时切换主题。

## 内容渲染组件

文章详情页需要将 Tiptap JSON AST 渲染为 React 组件。每个主题需要实现自己的一套内容渲染组件，以控制代码块、图片等元素的视觉呈现。

### 必须实现的文件

| 文件                                      | 说明                                                                             |
| :---------------------------------------- | :------------------------------------------------------------------------------- |
| `components/content/render.tsx`           | 核心映射：将 `image`、`codeBlock`、`tableCell` 等节点映射到主题自己的 React 组件 |
| `components/content/content-renderer.tsx` | 包装层，使用 `useMemo` 调用 `renderReact`                                        |
| `components/content/code-block.tsx`       | 代码块渲染（语法高亮、复制按钮等）                                               |
| `components/content/image-display.tsx`    | 图片展示（点击放大、caption 等）                                                 |
| `components/content/zoomable-image.tsx`   | 图片灯箱/放大交互                                                                |

### 关键：共享 Tiptap 扩展

`render.tsx` 必须从共享的编辑器配置中导入 Tiptap extensions，确保渲染器能识别所有文章内容支持的节点类型：

```tsx
// components/content/render.tsx
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { extensions } from "@/features/posts/editor/config";
import { CodeBlock } from "./code-block"; // 主题自己的实现
import { ImageDisplay } from "./image-display"; // 主题自己的实现

export function renderReact(content: JSONContent) {
  return renderToReactElement({
    extensions,
    content,
    options: {
      nodeMapping: {
        image: ({ node }) => <ImageDisplay /* ... */ />,
        codeBlock: ({ node }) => <CodeBlock /* ... */ />,
        // tableCell, tableHeader 等
      },
    },
  });
}
```

参考 `themes/default/components/content/` 和 `themes/fuwari/components/content/` 的完整实现。

## 可复用的共享代码

主题之间相互独立，但**可以且应该**复用框架提供的共享基础设施，避免重复造轮子：

| 可以 import        | 来源                                            | 说明                                |
| :----------------- | :---------------------------------------------- | :---------------------------------- |
| 博客配置           | `@/blog.config`                                 | 标题、作者、社交链接等              |
| 业务 Queries/Hooks | `@/features/*/queries/`、`@/features/*/hooks/`  | TanStack Query 查询工厂、业务 hooks |
| Schema 类型        | `@/features/*/schema`                           | Zod schema 和 TypeScript 类型       |
| Tiptap 编辑器配置  | `@/features/posts/editor/config`                | 文章编辑器的 extension 列表         |
| 评论编辑器配置     | `@/features/comments/components/editor/config`  | 评论编辑器的 extension 列表         |
| 通用 UI 组件       | `@/components/common/`（如 Turnstile 人机验证） | 与主题无关的功能组件                |
| 工具函数/Hooks     | `@/lib/utils`、`@/hooks/*`                      | 格式化、防抖等通用工具              |

> **评论系统**：每个主题需要在 `components/comments/` 下实现自己的评论区 UI 组件（编辑器、列表、评论项等）。评论的业务逻辑（`@/features/comments/queries/`、`@/features/comments/hooks/`）和编辑器配置（`@/features/comments/components/editor/config`）从共享位置导入，只有 UI 层是主题独立的。参考 `themes/default/components/comments/` 和 `themes/fuwari/components/comments/` 的实现。

## 主题专属配置

除了 `ThemeConfig`（数据获取参数）外，主题还可以在 `blogConfig` 中声明**专属配置项**，用于图片路径、颜色等需要用户自定义的内容。

### 约定

在 `src/blog.config.ts` 的 `theme` 命名空间下，以主题名为 key 添加配置：

```ts
// src/blog.config.ts
export const blogConfig = {
  // ... 公共配置 ...
  theme: {
    fuwari: {
      homeBg: env.VITE_FUWARI_HOME_BG || "/images/home-bg.jpg",
      avatar: env.VITE_FUWARI_AVATAR || "/images/avatar.png",
    },
    // "my-theme": { ... }
  },
};
```

### 环境变量命名规则

使用 `VITE_<THEME_NAME>_<KEY>` 格式，例如：

| 环境变量              | 说明                  | 默认值                |
| :-------------------- | :-------------------- | :-------------------- |
| `VITE_FUWARI_HOME_BG` | Fuwari 首页背景图路径 | `/images/home-bg.jpg` |
| `VITE_FUWARI_AVATAR`  | Fuwari 侧边栏头像路径 | `/images/avatar.png`  |

新增的环境变量需要同步添加到 `src/lib/env/client.env.ts` 的 Zod schema 中。

### 在组件中使用

```tsx
import { blogConfig } from "@/blog.config";

// 直接访问当前主题的配置
<img src={blogConfig.theme.fuwari.homeBg} alt="" />;
```

> **为什么不放在 `ThemeConfig` 中？** `ThemeConfig` 是编译时契约的一部分，主要用于路由 loader 的数据获取参数（如分页大小）。而图片路径等部署级别的配置更适合通过环境变量注入，放在 `blogConfig` 中可以统一管理，也方便用户在 `.env` 文件中覆盖。

## 注意事项

- **不要修改 contract 文件**：契约是框架与主题之间的接口约定，业务逻辑依赖它稳定。如有新的业务需求需要暴露更多数据，请提 issue 或 PR。
- **主题之间相互独立**：不同主题的代码不应相互引用，避免耦合。
- **样式隔离**：项目采用分层样式架构：
  - `src/styles.css` — 全局公共样式（TailwindCSS 入口、dark/light variant 等），所有主题共享，**主题不应修改此文件**。
  - `themes/<your-theme>/styles/` — 主题私有样式（颜色变量、字体、排版、组件样式等），在主题 `index.ts` 中通过 `import "./styles/index.css"` 引入，确保只在该主题激活时加载。
