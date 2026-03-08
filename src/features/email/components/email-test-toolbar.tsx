import { Loader2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailTestToolbarProps {
  status: "IDLE" | "TESTING" | "SUCCESS" | "ERROR";
  isConfigured: boolean;
  onTest: () => void;
}

export function EmailTestToolbar({
  status,
  isConfigured,
  onTest,
}: EmailTestToolbarProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-6 bg-muted/10 p-6 px-10 sm:flex-row">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full transition-all duration-700 ${
              status === "SUCCESS"
                ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : status === "ERROR"
                  ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  : status === "TESTING"
                    ? "animate-pulse bg-amber-500"
                    : "bg-muted-foreground/20"
            }`}
          />
          <span className="text-sm font-serif font-medium text-foreground">
            {status === "SUCCESS"
              ? "服务连接正常"
              : status === "ERROR"
                ? "连接测试失败"
                : status === "TESTING"
                  ? "正在测试连接..."
                  : "等待测试连接"}
          </span>
        </div>

        <span className="hidden h-4 w-px bg-border/30 md:block" />

        <p className="hidden text-xs text-muted-foreground md:block">
          {status === "IDLE"
            ? "填写完成后可发送测试邮件"
            : `当前状态：${status}`}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onTest}
        disabled={status === "TESTING" || !isConfigured}
        className={`h-10 rounded-none border-border/50 px-8 text-[10px] font-mono uppercase tracking-[0.2em] transition-all hover:bg-background ${
          !isConfigured ? "cursor-not-allowed opacity-30" : "text-foreground"
        }`}
      >
        {status === "TESTING" ? (
          <Loader2 size={12} className="mr-3 animate-spin" />
        ) : (
          <Wifi size={12} className="mr-3" />
        )}
        {status === "TESTING" ? "测试中..." : "发送测试邮件"}
      </Button>
    </div>
  );
}
