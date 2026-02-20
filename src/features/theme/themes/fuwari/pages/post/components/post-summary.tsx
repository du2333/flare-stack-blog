import { Quote } from "lucide-react";

interface PostSummaryProps {
  summary?: string | null;
}

export function PostSummary({ summary }: PostSummaryProps) {
  if (!summary) return null;

  return (
    <div
      className="mb-4 md:mb-6 rounded-2xl bg-(--fuwari-primary)/5 border border-black/5 dark:border-white/10 p-4 md:p-5 flex items-start gap-3 md:gap-4 transition-all hover:bg-(--fuwari-primary)/10 fuwari-onload-animation backdrop-blur-sm"
      style={{ animationDelay: "200ms" }}
    >
      <div className="shrink-0 text-(--fuwari-primary) bg-(--fuwari-primary)/10 p-2 md:p-2.5 rounded-xl flex items-center justify-center mt-0.5">
        <Quote className="w-4 h-4 md:w-4.5 md:h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[11px] md:text-xs font-bold text-(--fuwari-primary) flex items-center mb-1 md:mb-1.5 uppercase tracking-[0.2em] opacity-80">
          文章摘要
        </h3>
        <p className="text-sm md:text-[15px] leading-relaxed fuwari-text-70 font-medium">
          {summary}
        </p>
      </div>
    </div>
  );
}
