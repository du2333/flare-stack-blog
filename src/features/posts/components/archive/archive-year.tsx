import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";

interface ArchiveYearProps {
  year: number;
  count: number;
}

export function ArchiveYear({ year, count }: ArchiveYearProps) {
  // A heading: the year, with its count of Posts on the right.
  if (useThemeRecipe().archive !== "timeline") {
    return (
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <h2 className="fuwari-heading text-2xl font-bold fuwari-text-90">
          {year}
        </h2>
        <span className="text-sm fuwari-text-50">
          {m.posts_count({ count })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-row w-full items-center h-15">
      <div className="w-[15%] md:w-[10%] transition text-2xl font-bold text-right fuwari-text-75">
        {year}
      </div>
      <div className="w-[15%] md:w-[10%]">
        <div
          className="h-3 w-3 bg-none rounded-full outline outline-(--theme-accent) mx-auto
          -outline-offset-2 z-50"
        />
      </div>
      <div className="w-[70%] md:w-[80%] transition text-left fuwari-text-50">
        {m.posts_count({ count })}
      </div>
    </div>
  );
}
