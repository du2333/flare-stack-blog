# 贡献指南

感谢你考虑为本项目做出贡献！

## 快速开始

### 环境要求

- Node.js 20+
- Bun 1.3+

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/du2333/flare-stack-blog.git
cd flare-stack-blog

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env            # 客户端变量
cp .dev.vars.example .dev.vars  # 服务端变量
# 编辑 .env 和 .dev.vars 填入必要的配置

# 配置 Wrangler
cp wrangler.example.jsonc wrangler.jsonc
# 编辑 wrangler.jsonc，填入你的资源 ID

# 启动开发服务器
bun dev
```

访问 http://localhost:3000 查看应用。

开始改动业务前，建议先阅读 [错误处理与 Result 模式快速上手](./docs/error-handling-quickstart.md)。

## 开发工作流

### 提交前检查

每次提交前，确保通过以下检查：

```bash
bun check  # 类型检查 + Lint + 格式化
bun run test  # 运行测试
```

### 提交信息

使用清晰的提交信息：

```
feat: 添加 RSS 订阅功能
fix: 修复登录状态丢失问题
docs: 更新 API 文档
refactor: 重构缓存层
```

## 代码模式速查

### 1. 三层架构

每个功能模块遵循三层架构：

```
features/<name>/
├── data/               # 数据层：纯 Drizzle 查询，无业务逻辑
├── <name>.service.ts   # 服务层：业务逻辑 + 缓存编排
├── <name>.schema.ts    # Zod schemas + 缓存 key 工厂
└── api/                # API 层：Server Functions 入口
```

**数据层示例**：

```typescript
// posts.data.ts
export const PostRepo = {
  findPostById: (db: DB, id: number) =>
    db.select().from(posts).where(eq(posts.id, id)).get(),
};
```

**服务层示例**：

```typescript
// posts.service.ts
export async function findPostBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  data: { slug: string },
) {
  const fetcher = () => PostRepo.findPostBySlug(context.db, data.slug);
  const version = await CacheService.getVersion(context, "posts:detail");
  return CacheService.get(
    context,
    POSTS_CACHE_KEYS.detail(version, data.slug),
    PostSchema,
    fetcher,
  );
}
```

### 2. Result 类型（错误处理）

遵循以下约定：

1. `Result` 仅用于业务错误（如 `POST_NOT_FOUND`、`MEDIA_IN_USE`）。
2. 请求级错误（鉴权、权限、限流、人机验证）由 middleware 直接 `throw`。
3. 无业务错误的 service 直接返回 `T`，不包 `ok(...)`。
4. 默认依赖 TypeScript 自动推断返回类型，只有在公共边界需要锁定类型时才显式标注。

示例：

```typescript
import { ok, err } from "@/lib/errors";

// 服务层（有业务错误 -> Result）
export async function createTag(context: DbContext, name: string) {
  const exists = await TagRepo.nameExists(context.db, name);
  if (exists) return err({ reason: "TAG_NAME_ALREADY_EXISTS" });

  const tag = await TagRepo.insert(context.db, { name });
  return ok(tag);
}

// 调用方（query/mutation 约定：在 onSuccess 处理业务错误）
const createTagMutation = useMutation({
  mutationFn: (name: string) => createTagFn({ data: { name } }),
  onSuccess: (result) => {
    if (result.error) {
      switch (result.error.reason) {
        case "TAG_NAME_ALREADY_EXISTS":
          toast.error("标签已存在");
          return;
        default:
          result.error.reason satisfies never; // 穷尽检查
          return;
      }
    }

    toast.success("标签已创建");
  },
});

// 服务层（无业务错误 -> 直接返回 T）
export async function getTags(context: DbContext) {
  return TagRepo.findAll(context.db);
}
```

### 3. 中间件链

TanStack Start 中间件按顺序注入依赖：

```
dbMiddleware → sessionMiddleware → authMiddleware → adminMiddleware
```

使用示例：

```typescript
// 公开接口 + 限流
export const createCommentFn = createServerFn()
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1m",
      key: "comments:create",
    }),
  ])
  .handler(({ data, context }) => CommentService.createComment(context, data));

// 公开接口（仅需数据库）
export const getPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PostService.getPosts(context));

// 管理接口（需要认证 + 管理员权限）
export const updatePostFn = createServerFn()
  .middleware([adminMiddleware]) // 自动包含 db + session + auth 检查
  .handler(({ data, context }) => PostService.updatePost(context, data));
```

### 4. 缓存策略

双层缓存架构：

| 层  | 技术                  | 用途                                        |
| --- | --------------------- | ------------------------------------------- |
| CDN | Cache-Control headers | 边缘缓存，通过页面 headers 或 Hono 路由设置 |
| KV  | 版本化 key            | 服务端缓存，通过 `CacheService` 管理        |

失效模式：

```typescript
// 批量失效：递增版本号
await CacheService.bumpVersion(context, "posts:list");

// 单条失效：删除特定 key
const version = await CacheService.getVersion(context, "posts:detail");
await CacheService.deleteKey(context, POSTS_CACHE_KEYS.detail(version, slug));
```

### 5. TanStack Query 模式

错误处理规范统一维护在 [错误处理与 Result 模式快速上手](./docs/error-handling-quickstart.md)，这里不再重复。

Query Key 工厂：

```typescript
export const POSTS_KEYS = {
  all: ["posts"] as const,
  lists: ["posts", "list"] as const, // 父 key（静态，用于批量失效）
  list: (
    filters?: { tag?: string }, // 子 key（函数，用于具体查询）
  ) => ["posts", "list", filters] as const,
};
```

#### SSR/预加载模式（Route Loader）

在路由 loader 中使用 `ensureQueryData` 或 `prefetchQuery` 预加载数据：

```typescript
// routes/_public/post/$slug.tsx
export const Route = createFileRoute("/_public/post/$slug")({
  loader: async ({ context, params }) => {
    // ensureQueryData: 获取并缓存，如果已有数据则不重新请求
    const post = await context.queryClient.ensureQueryData(
      postBySlugQuery(params.slug),
    );
    if (!post) throw notFound();

    // prefetchQuery: 后台预加载（不阻塞渲染）
    void context.queryClient.prefetchQuery(relatedPostsQuery(params.slug));

    return post;
  },
  component: PostPage,
});
```

#### 组件数据获取

- **`useSuspenseQuery`**：配合 loader 使用，数据已预加载，渲染同步
- **`useQuery`**：纯客户端获取，无预加载

```typescript
// SSR 场景（loader 已预加载）
function PostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug)); // 同步获取
  return <article>{post.content}</article>;
}

// 纯客户端场景
function RelatedPosts({ slug }: { slug: string }) {
  const { data } = useQuery(relatedPostsQuery(slug)); // 可能显示 loading
  // ...
}
```

#### 失效模式

```typescript
// 批量失效
queryClient.invalidateQueries({ queryKey: POSTS_KEYS.lists });

// 精确失效
queryClient.invalidateQueries({ queryKey: POSTS_KEYS.list({ tag: "React" }) });
```

### 6. 日志规范

使用结构化 JSON 日志，便于在 Workers Observability 中搜索过滤：

```typescript
// ✅ Good
console.log(JSON.stringify({ message: "cache hit", key: serializedKey }));
console.error(
  JSON.stringify({
    message: "image transform failed",
    key,
    error: String(error),
  }),
);

// 🔴 Bad
console.log(`[Cache] HIT: ${serializedKey}`);
console.error("Image transform failed:", error);
```

关键业务日志（请求入口、错误、重要事件）使用结构化格式，开发调试日志可保持原样。

## 命名规范

| 类型             | 规范                 | 示例               |
| ---------------- | -------------------- | ------------------ |
| 组件文件         | kebab-case           | `post-item.tsx`    |
| 服务文件         | `<name>.service.ts`  | `posts.service.ts` |
| 数据文件         | `<name>.data.ts`     | `posts.data.ts`    |
| Server Functions | camelCase + `Fn`     | `getPostsFn`       |
| React 组件       | PascalCase           | `PostItem`         |
| 变量/函数        | camelCase            | `getPosts`         |
| 类型/接口        | PascalCase           | `PostItemProps`    |
| 常量             | SCREAMING_SNAKE_CASE | `CACHE_CONTROL`    |

## 测试

```bash
# 运行所有测试
bun run test

# 运行特定测试
bun run test posts

# 运行单个文件
bun run test src/features/posts/posts.service.test.ts
```

### 测试工具

```typescript
import {
  createAdminTestContext,
  seedUser,
  waitForBackgroundTasks,
  testRequest,
} from "tests/test-utils";

// 创建上下文
const context = createAdminTestContext();
await seedUser(context.db, context.session.user);

// 等待后台任务
await waitForBackgroundTasks(context.executionCtx);

// 测试 Hono 路由
const response = await testRequest(app, "/api/posts");
```

## PR 检查清单

提交 PR 前，确保：

- [ ] 通过 `bun check`（类型检查 + Lint + 格式化）
- [ ] 通过 `bun run test`
- [ ] 新功能有对应的测试覆盖
- [ ] 遵循现有的代码模式和命名规范

## 需要帮助？

如有疑问，可以：

- 在 GitHub Discussions 中提问
- 在 Telegram 群组中提问
- 参考 `.agent/skills/` 目录下的开发指南

感谢你的贡献！
