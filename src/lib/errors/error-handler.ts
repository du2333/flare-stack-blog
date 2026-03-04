import { toast } from "sonner";
import { parseRequestError } from "./request-errors";

export function handleServerError(error: unknown): void {
  const parsed = parseRequestError(error);
  const { code } = parsed;

  switch (code) {
    case "UNAUTHENTICATED": {
      toast.error("未登录", {
        description: "请先登录",
      });
      break;
    }
    case "PERMISSION_DENIED": {
      toast.error("权限不足", {
        description: "当前操作仅管理员可执行",
      });
      break;
    }
    case "RATE_LIMITED": {
      const seconds = Math.max(1, Math.ceil(parsed.retryAfterMs / 1000));
      toast.warning("请求过于频繁", {
        description: `请 ${seconds} 秒后重试`,
      });
      break;
    }
    case "TURNSTILE_FAILED": {
      toast.error("人机验证失败", {
        description: parsed.message,
      });
      break;
    }
    case "UNKNOWN":
      toast.error("请求失败", {
        description: "发生了未预期的错误，请稍后重试",
      });
      break;
    default:
      code satisfies never;
  }
}
