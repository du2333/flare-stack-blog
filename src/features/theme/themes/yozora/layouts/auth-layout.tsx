import { ArrowLeft } from "lucide-react";
import type { AuthLayoutProps } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-(--fuwari-page-bg) text-(--fuwari-text-75) flex flex-col items-center justify-center p-4">
      {/* 纸面背景：右上竖排水印 + 一点烫金晕 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-[8%] right-[7%] yz-auth-watermark"
          aria-hidden="true"
        >
          雨月ノ小窝
        </div>
        <div className="absolute top-[-10%] right-[-6%] w-[38%] h-[38%] bg-(--fuwari-primary) opacity-[0.05] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 fuwari-onload-animation">
        {/* Back: 文字式，不做按钮块 */}
        <button
          onClick={onBack}
          className="group absolute -top-12 left-0 flex items-center gap-1.5 text-xs tracking-widest fuwari-text-50 hover:text-(--fuwari-primary) transition-colors"
          title={m.auth_layout_back_home()}
        >
          <ArrowLeft
            size={15}
            strokeWidth={1.5}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="font-mono uppercase">{m.auth_layout_back_home()}</span>
        </button>

        {/* Auth Card Container */}
        <div className="fuwari-card-base p-8 md:p-10 w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
