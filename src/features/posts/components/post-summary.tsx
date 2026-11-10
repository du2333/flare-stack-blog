import { Quote } from "lucide-react";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";

interface PostSummaryProps {
  summary?: string | null;
}

const ENTER_DELAY = {
  animationDelay:
    "calc(var(--fuwari-content-delay) + 250ms * var(--fuwari-stagger, 1))",
};

export function PostSummary({ summary }: PostSummaryProps) {
  const form = useThemeRecipe().summary;
  if (!summary) return null;

  // A standfirst: the summary opens the article, led by a thin accent line.
  if (form === "standfirst") {
    return (
      <p
        className="mb-6 md:mb-8 border-l-2 border-(--theme-accent) pl-4 md:pl-5 text-base md:text-lg leading-relaxed fuwari-text-75 wrap-break-word fuwari-onload-animation"
        style={ENTER_DELAY}
      >
        {summary}
      </p>
    );
  }

  return (
    <div
      className="mb-4 md:mb-6 rounded-2xl bg-(--theme-accent)/5 border border-black/5 dark:border-white/10 p-4 md:p-5 flex items-start gap-3 md:gap-4 transition-all hover:bg-(--theme-accent)/10 fuwari-onload-animation backdrop-blur-sm"
      style={ENTER_DELAY}
    >
      <div className="shrink-0 text-(--theme-accent) bg-(--theme-accent)/10 p-2 md:p-2.5 rounded-xl flex items-center justify-center mt-0.5">
        <Quote className="w-4 h-4 md:w-4.5 md:h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[11px] md:text-xs font-bold text-(--theme-accent) flex items-center mb-1 md:mb-1.5 uppercase tracking-[0.2em] opacity-80">
          {m.post_summary_title()}
        </h3>
        <p className="text-sm md:text-[15px] leading-relaxed fuwari-text-75 font-medium">
          {summary}
        </p>
      </div>
    </div>
  );
}
