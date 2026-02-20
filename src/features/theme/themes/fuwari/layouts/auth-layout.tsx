import { ArrowLeft } from "lucide-react";
import type { AuthLayoutProps } from "@/features/theme/contract/layouts";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-(--fuwari-page-bg) text-(--fuwari-text-75) flex flex-col items-center justify-center p-4">
      {/* Background decoration (optional but adds to the theme) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-(--fuwari-primary) opacity-[0.03] rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-(--fuwari-primary) opacity-[0.03] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 fuwari-onload-animation">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group absolute -top-14 left-0 flex items-center justify-center w-10 h-10 rounded-xl bg-(--fuwari-card-bg) shadow-sm text-(--fuwari-text-50) hover:text-(--fuwari-text-90) hover:shadow-md transition-all shrink-0"
          title="返回"
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
        </button>

        {/* Auth Card Container */}
        <div className="fuwari-card-base p-8 md:p-10 w-full shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
