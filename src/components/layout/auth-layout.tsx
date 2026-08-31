import { ArrowLeft } from "lucide-react";
import type { AuthLayoutProps } from "@/components/layout/layout-props";
import { m } from "@/paraglide/messages";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="w-full flex justify-center">
      <div
        className="w-full max-w-md fuwari-onload-animation"
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 50ms)" }}
      >
        <div className="fuwari-card-base p-8 md:p-10 w-full">
          <button
            type="button"
            onClick={onBack}
            className="fuwari-expand-animation rounded-lg -mt-1 -ml-2 mb-6 px-2 py-1 text-sm fuwari-text-50 hover:text-(--fuwari-primary) inline-flex items-center gap-1"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            {m.common_back()}
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
