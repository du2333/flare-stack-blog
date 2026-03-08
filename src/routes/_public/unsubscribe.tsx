import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { unsubscribeByTokenFn } from "@/features/email/api/email.api";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/db/schema";
import { EMAIL_KEYS } from "@/features/email/queries";

const unsubscribeSearchSchema = z
  .object({
    userId: z.string(),
    type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
    token: z.string(),
  })
  .partial();

export const Route = createFileRoute("/_public/unsubscribe")({
  ssr: false,
  validateSearch: unsubscribeSearchSchema,
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { userId, type, token } = Route.useSearch();
  const hasValidParams = !!(userId && type && token);

  const { data, error, isLoading } = useQuery({
    queryKey: EMAIL_KEYS.unsubscribe({
      userId: userId!,
      type: type!,
      token: token!,
    }),
    queryFn: () =>
      unsubscribeByTokenFn({
        data: { userId: userId!, type: type!, token: token! },
      }),
    retry: false,
    enabled: hasValidParams,
  });
  const hasBusinessError = !!data?.error;
  const hasFailed = !!error || hasBusinessError;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {!hasValidParams ? (
          <div className="space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif">无效的退订链接</h1>
              <p className="text-muted-foreground">
                退订链接不完整或已失效。请点击邮件底部的完整链接，或在个人资料中管理您的订阅。
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-none">
              <a href="/">返回首页</a>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-serif">正在处理退订请求...</h1>
          </div>
        ) : hasFailed ? (
          <div className="space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif text-red-500">退订失败</h1>
              <p className="text-muted-foreground">
                退订请求失败。链接可能已过期或签名无效。
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-none">
              <a href="/">返回首页</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif">退订成功</h1>
              <p className="text-muted-foreground">
                您已成功退订此类通知邮件。如有需要，您可以在个人中心随时恢复订阅。
              </p>
            </div>
            <Button asChild className="rounded-none px-8">
              <a href="/">返回首页</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
