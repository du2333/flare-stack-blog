import { ArrowLeft } from "lucide-react";
import type { AuthLayoutProps } from "@/features/theme/contract/layouts";
import { m } from "@/paraglide/messages";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      {/* 固定全屏背景(与公共布局一致) */}
      <div
        className="cuckoo-background"
        style={{
          backgroundImage:
            "linear-gradient(135deg, oklch(0.85 0.09 15) 0%, oklch(0.9 0.06 60) 45%, oklch(0.85 0.08 300) 100%)",
        }}
      />

      <div className="cuckoo-onload-animation relative z-10 w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="cuckoo-card-base cuckoo-text-50 hover:cuckoo-text-90 absolute -top-14 left-0 flex h-10 w-10 items-center justify-center shadow-md transition-all"
          title={m.auth_layout_back_home()}
        >
          <ArrowLeft size={18} />
        </button>

        <div className="cuckoo-card-base w-full p-8 shadow-lg md:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
