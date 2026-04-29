import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { tagsQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

export function TagsSkeleton() {
  return (
    <div className="fuwari-card-base p-4">
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Enhanced Tags Panel — Amazing Theme
 *
 * Features:
 * - Each tag gets a unique hue-based gradient on hover
 * - Bounce-expand animation for the expand/collapse toggle
 * - Sparkles icon for section header
 * - Tags float up slightly on hover
 */
export function Tags() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setShowToggle(containerRef.current.scrollHeight > 160);
    }
  }, [tags]);

  if (tags.length === 0) return null;

  return (
    <div className="fuwari-card-base pb-4 transition-all duration-300 hover:shadow-md">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2 flex items-center gap-2">
        <span
          className="absolute -left-4 top-[5.5px] w-1 h-4 rounded-md transition-all duration-300"
          style={{
            background: `linear-gradient(180deg, rgb(var(--amazing-primary-rgb)), rgb(var(--amazing-accent-rgb)))`,
          }}
        />
        {m.tags_title()}
        <Sparkles
          size={14}
          className="text-(--fuwari-primary) opacity-50"
          strokeWidth={1.5}
        />
      </div>

      <div
        ref={containerRef}
        className={`px-4 flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-500 ${
          isExpanded || !showToggle ? "max-h-250" : "max-h-40"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {tags.map((tag, index) => {
          // Generate unique hue for each tag based on index
          const hue = (index * 37) % 360;
          return (
            <Link
              key={tag.id}
              to="/posts"
              search={{ tagName: tag.name }}
              className="fuwari-btn-regular h-8 text-sm px-3 rounded-lg flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group"
              style={
                {
                  "--tag-hue": `${hue}`,
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, hsla(${hue}, 70%, 60%, 0.15), hsla(${hue + 60}, 70%, 60%, 0.1))`;
                (e.currentTarget as HTMLElement).style.borderColor = `hsla(${hue}, 70%, 60%, 0.3)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.borderColor = "";
              }}
            >
              <span className="transition-colors group-hover:text-(--fuwari-primary)">
                {tag.name}
              </span>
              <span className="bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 text-xs opacity-70 transition-opacity group-hover:opacity-100">
                {tag.postCount}
              </span>
            </Link>
          );
        })}
      </div>

      {showToggle && (
        <div className="px-4 pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 flex items-center justify-center gap-1 text-sm fuwari-text-50 hover:text-(--fuwari-primary) transition-all duration-300 hover:gap-2 active:scale-95"
          >
            {isExpanded ? (
              <>
                {m.tags_collapse()} <ChevronUp size={16} />
              </>
            ) : (
              <>
                {m.tags_expand()} <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
