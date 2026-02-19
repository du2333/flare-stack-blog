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

| 字段                                                    | 说明                           |
| :------------------------------------------------------ | :----------------------------- |
| `PublicLayout`                                          | 公共布局（含 Navbar / Footer） |
| `AuthLayout`                                            | 认证页布局                     |
| `UserLayout`                                            | 登录用户专属布局               |
| `HomePage` / `HomePageSkeleton`                         | 首页及其加载骨架屏             |
| `PostsPage` / `PostsPageSkeleton`                       | 文章列表页及骨架屏             |
| `PostPage` / `PostPageSkeleton`                         | 文章详情页及骨架屏             |
| `FriendLinksPage` / `FriendLinksPageSkeleton`           | 友链列表页及骨架屏             |
| `SearchPage` / `SearchPageSkeleton`                     | 搜索页及骨架屏                 |
| `SubmitFriendLinkPage` / `SubmitFriendLinkPageSkeleton` | 友链提交页及骨架屏             |
| `LoginPage`                                             | 登录页                         |
| `RegisterPage`                                          | 注册页                         |
| `ForgotPasswordPage`                                    | 找回密码页                     |
| `ResetPasswordPage`                                     | 重置密码页                     |
| `VerifyEmailPage`                                       | 邮箱验证页                     |
| `ProfilePage`                                           | 个人资料页                     |

> **骨架屏**用于 TanStack Router 的 `pendingComponent`，在数据加载期间展示占位 UI。如果不需要加载态，返回 `null` 即可。

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
└── components/               # 主题内部共享组件（可选）
```

## Step-by-step：创建第一个主题

### Step 1：创建主题目录

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

## 注意事项

- **不要修改 contract 文件**：契约是框架与主题之间的接口约定，业务逻辑依赖它稳定。如有新的业务需求需要暴露更多数据，请提 issue 或 PR。
- **主题之间相互独立**：不同主题的代码不应相互引用，避免耦合。