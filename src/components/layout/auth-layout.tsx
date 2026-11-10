import "@/features/auth/components/auth-pages.css";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthLayoutProps } from "@/components/layout/layout-props";
import { m } from "@/paraglide/messages";

export function AuthLayout({ onBack, children }: AuthLayoutProps) {
  return (
    <div className="w-full flex justify-center">
      <div
        className="auth-frame w-full max-w-md fuwari-onload-animation"
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 50ms)" }}
      >
        <div className="auth-card fuwari-card-base fuwari-card-standalone py-8 px-(--theme-standalone-pad-x-narrow,--spacing(8)) sm:px-8 md:p-10 w-full">
          <Button
            variant="plain"
            size="sm"
            onClick={onBack}
            icon={<ArrowLeft size={16} strokeWidth={1.5} />}
            className="-mt-1 -ml-3 mb-6"
          >
            {m.common_back()}
          </Button>
          {children}
        </div>
      </div>
    </div>
  );
}
