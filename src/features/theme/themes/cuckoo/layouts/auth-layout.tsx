import { ArrowLeft } from "lucide-react";
import { BackgroundLayer } from "../components/background-layer";
import type { AuthLayoutProps } from "@/features/theme/contract/layouts";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--cuckoo-page-bg)] flex items-center justify-center p-4">
      {/* Background Layer */}
      <BackgroundLayer />
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 cuckoo-text-secondary hover:cuckoo-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">返回</span>
        </button>

        {/* Auth Card */}
        <div className="cuckoo-card p-8">{children}</div>
      </div>
    </div>
  );
}
