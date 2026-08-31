import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusPage({
  code,
  title,
  description,
  action,
}: {
  code?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="fuwari-card-base fuwari-onload-animation flex flex-col items-center justify-center px-6 py-20 text-center md:py-24">
      {code ? <p className="text-sm text-(--fuwari-primary)">{code}</p> : null}
      <h1 className={cn("text-2xl font-medium fuwari-text-90", code && "mt-4")}>
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed fuwari-text-50">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
