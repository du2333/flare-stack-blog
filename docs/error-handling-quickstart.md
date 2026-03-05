# 错误处理与 Result 模式快速上手

这份文档用于统一项目中的错误处理方式，帮助贡献者快速判断「该返回 `Result` 还是直接 `throw`」。

## 一句话规则

1. `Result` 只处理业务错误（可预期、可恢复、需界面提示或分支处理）。
2. 请求级错误（鉴权、权限、限流、人机验证）由中间件直接 `throw`（仅指 TanStack Start / ServerFn 中间件；`Hono /api` 是独立 HTTP 通道，不套这套 `Result` 约定）。
3. 没有业务错误的 service 直接返回 `T`，不要包 `ok(...)`。
4. 默认让 TypeScript 自动推断返回类型，仅在公共边界需要“锁类型”时再显式标注。

## 分层职责

### `middleware`

1. 处理请求级问题：`UNAUTHENTICATED`、`PERMISSION_DENIED`、`RATE_LIMITED`、`TURNSTILE_FAILED`。
2. 通过 `createXxxError` 抛出可序列化错误（位于 `src/lib/errors/request-errors.ts`）。

### `service`

1. 处理业务规则与业务错误，例如 `POST_NOT_FOUND`、`MEDIA_IN_USE`、`TAG_NOT_FOUND`。
2. 有业务错误时返回 `Result<T, { reason: ... }>`。
3. 无业务错误时返回纯数据 `T`。

### `api`（server function）

1. 尽量做薄层转发：鉴权和限流交给 middleware，业务交给 service。
2. 不在 API 层重复包装 `ok(...)`（除非该 API 自身确实有独立业务错误分支）。

### `client`（TanStack Query）

1. `query/mutation` 默认不写自定义 `onError`，请求级错误统一走全局 `onError`：`src/lib/errors/error-handler.ts`。
2. 业务错误统一在 `onSuccess` 中处理 `result.error.reason` 分支。

## 何时用 Result

使用 `Result` 的典型场景：

1. 资源不存在：`POST_NOT_FOUND`、`COMMENT_NOT_FOUND`。
2. 状态冲突：`MEDIA_IN_USE`、`TAG_IN_USE`。
3. 业务前置条件不满足：`EMAIL_DISABLED`、`INVALID_PROGRESS_DATA`。

不使用 `Result` 的场景：

1. 纯查询/写入，业务上没有失败分支，失败只可能是系统异常。
2. 请求级失败（鉴权、权限、限流）已经由中间件处理。

## 全链路示例

### 1) Middleware：抛请求级错误

```ts
// src/lib/middlewares.ts
if (!context.session) {
  throw createAuthError();
}
if (context.session.user.role !== "admin") {
  throw createPermissionError();
}
```

### 2) Service：只返回业务错误

```ts
// src/features/tags/tags.service.ts
import { err, ok } from "@/lib/errors";

export async function deleteTag(id: string) {
  const found = await repo.findById(id);
  if (!found) return err({ reason: "TAG_NOT_FOUND" });

  await repo.remove(id);
  return ok(undefined);
}

// 无业务错误：直接返回 T
export async function listTags() {
  return repo.listAll();
}
```

如果你希望对外固定类型边界，再显式标注 `Promise<Result<...>>`。

### 3) API：薄层转发

```ts
// src/features/tags/api/tags.admin.api.ts
export const deleteTagFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware]) // 请求级错误交给 middleware throw
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    return TagService.deleteTag(data.id); // 业务错误按 Result 往前传
  });
```

### 4) Query：无业务错误时直接返回数据

```ts
// src/features/tags/queries/index.ts
export function tagsQuery() {
  return queryOptions({
    queryKey: TAGS_KEYS.all,
    queryFn: async () => {
      return getTagsFn(); // getTagsFn 返回 Tag[]，不是 Result
    },
  });
}
```

### 5) Mutation：在 hook 内统一处理业务错误

```ts
// src/features/tags/hooks/use-tags.ts
export function useDeleteTag() {
  return useMutation({
    mutationFn: (id: string) => deleteTagFn({ data: { id } }),
    onSuccess: (result) => {
      if (result.error) {
        switch (result.error.reason) {
          case "TAG_NOT_FOUND":
            toast.error("标签不存在或已删除");
            return;
          default:
            result.error.reason satisfies never;
            return;
        }
      }

      toast.success("标签已删除");
    },
  });
}
```

### 6) 全局请求错误处理（TanStack Query）

```ts
// src/integrations/tanstack-query/root-provider.tsx
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleServerError }),
  mutationCache: new MutationCache({ onError: handleServerError }),
});
```

```ts
// src/lib/errors/error-handler.ts
export function handleServerError(error: unknown) {
  const parsed = parseRequestError(error);
  const { code } = parsed;

  switch (code) {
    case "UNAUTHENTICATED":
      window.location.href = "/login";
      return;
    case "PERMISSION_DENIED":
      toast.error("权限不足");
      return;
    case "RATE_LIMITED":
      toast.warning("请求过于频繁");
      return;
    case "TURNSTILE_FAILED":
      toast.error(parsed.message);
      return;
    case "UNKNOWN":
      toast.error("请求失败");
      return;
    default:
      code satisfies never;
  }
}
```

### 7) `handleServerError` 必须做穷尽检查

1. `switch` 里显式列出每个请求错误 `code`。
2. `default` 分支只保留 `code satisfies never`，不要写兜底 toast。
3. 新增 `request-errors` union 成员后，如果这里没更新，TypeScript 必须立刻报错。

## 新增请求错误时要改哪些地方

1. 在 `src/lib/errors/request-errors.ts` 的 zod union 增加新 `code` 和字段。
2. 增加对应 `createXxxError` 构造函数。
3. 在 `src/lib/errors/error-handler.ts` 增加该 `code` 的前端处理分支。
4. 补充测试：至少覆盖序列化/反序列化和前端行为。

## PR 自检清单

1. 是否把请求级错误误写成 `Result` 了？
2. 是否把业务错误误写成 `throw` 了？
3. 无业务错误 service 是否仍在返回 `ok(data)`？
4. Query 是否吞掉业务错误（例如直接返回空数组）导致用户无感知？
