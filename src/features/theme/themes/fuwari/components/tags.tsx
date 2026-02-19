import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TagWithCount } from "@/features/tags/tags.schema";
import { tagsQueryOptions } from "@/features/tags/queries";

export function Tags() {
  // Cast the result to TagWithCount[] since we know public tags have count
  const { data } = useSuspenseQuery(tagsQueryOptions);
  const tags = data as Array<TagWithCount>;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Check if content height exceeds max height (10rem / 160px)
      setShowToggle(containerRef.current.scrollHeight > 160);
    }
  }, [tags]);

  if (tags.length === 0) return null;

  return (
    <div className="fuwari-card-base pb-4 transition-all duration-300">
      <div className="font-bold text-lg fuwari-text-90 relative ml-6 mt-4 mb-2">
        <span
          className="absolute left-[-1rem] top-[5.5px] w-1 h-4 rounded-md"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        标签
      </div>

      <div
        ref={containerRef}
        className={`px-4 flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          isExpanded || !showToggle ? "max-h-[1000px]" : "max-h-[160px]"
        }`}
      >
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to="/posts"
            search={{ tagName: tag.name }}
            className="fuwari-btn-regular h-8 text-sm px-3 rounded-lg flex items-center gap-2"
          >
            <span>{tag.name}</span>
            <span className="bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 text-xs opacity-70">
              {tag.postCount}
            </span>
          </Link>
        ))}
      </div>

      {showToggle && (
        <div className="px-4 pt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2 flex items-center justify-center gap-1 text-sm fuwari-text-50 hover:text-[var(--fuwari-primary)] transition-colors"
          >
            {isExpanded ? (
              <>
                收起 <ChevronUp size={16} />
              </>
            ) : (
              <>
                展开更多 <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
