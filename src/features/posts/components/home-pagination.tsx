import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { m } from "@/paraglide/messages";

function pageNumbers(page: number, total: number, visible: number) {
  const start = Math.max(
    1,
    Math.min(page - Math.floor(visible / 2), total - visible + 1),
  );
  const end = Math.min(total, start + visible - 1);
  const pages: Array<number | "gap-start" | "gap-end"> = [];
  if (start > 1) pages.push(1);
  if (start === 3 && visible > 1) pages.push(2);
  else if (start > 2) pages.push("gap-start");
  for (let n = start; n <= end; n++) pages.push(n);
  if (end === total - 2 && visible > 1) pages.push(total - 1);
  else if (end < total - 1) pages.push("gap-end");
  if (end < total) pages.push(total);
  return pages;
}

/** Page numbers for a list of pages at `to`: the home page, or the Moments timeline. */
export function HomePagination({
  to = "/",
  page,
  totalPages,
}: {
  to?: "/" | "/moments";
  page: number;
  totalPages: number;
}) {
  const buttonClass =
    "bg-(--fuwari-card-bg) hover:bg-(--fuwari-btn-regular-bg-hover) transition flex items-center justify-center h-11 w-9 sm:w-11 rounded-lg hover:text-(--fuwari-primary)";
  const pages = (visible: number) =>
    pageNumbers(page, totalPages, visible).map((number) => {
      if (typeof number !== "number")
        return (
          <span
            key={number}
            className="flex w-5 sm:w-6 items-center justify-center"
            aria-hidden="true"
          >
            <Ellipsis size={20} />
          </span>
        );
      if (number === page)
        return (
          <span
            key={number}
            aria-current="page"
            aria-label={m.home_page_number({ page: number })}
            className="flex h-11 w-9 sm:w-11 items-center justify-center rounded-lg bg-(--fuwari-primary) text-white dark:text-black/70"
          >
            {number}
          </span>
        );
      return (
        <Link
          key={number}
          activeOptions={{ exact: true, explicitUndefined: true }}
          to={to}
          search={{ page: number === 1 ? undefined : number }}
          aria-label={m.home_page_number({ page: number })}
          className={`${buttonClass} active:scale-[0.85]`}
        >
          {number}
        </Link>
      );
    });
  return (
    <nav
      aria-label={m.home_pagination()}
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      {page === 1 ? (
        <button
          type="button"
          disabled
          aria-label={m.home_previous_page()}
          className={`${buttonClass} cursor-not-allowed opacity-50`}
        >
          <ChevronLeft size={28} />
        </button>
      ) : (
        <Link
          activeOptions={{ exact: true, explicitUndefined: true }}
          to={to}
          search={{ page: page === 2 ? undefined : page - 1 }}
          aria-label={m.home_previous_page()}
          className={`${buttonClass} text-(--fuwari-primary)`}
        >
          <ChevronLeft size={28} />
        </Link>
      )}
      <div className="flex rounded-lg bg-(--fuwari-card-bg) font-bold fuwari-text-75 sm:hidden">
        {pages(1)}
      </div>
      <div className="hidden rounded-lg bg-(--fuwari-card-bg) font-bold fuwari-text-75 sm:flex">
        {pages(5)}
      </div>
      {page === totalPages ? (
        <button
          type="button"
          disabled
          aria-label={m.home_next_page()}
          className={`${buttonClass} cursor-not-allowed opacity-50`}
        >
          <ChevronRight size={28} />
        </button>
      ) : (
        <Link
          activeOptions={{ exact: true, explicitUndefined: true }}
          to={to}
          search={{ page: page + 1 }}
          aria-label={m.home_next_page()}
          className={`${buttonClass} text-(--fuwari-primary)`}
        >
          <ChevronRight size={28} />
        </Link>
      )}
    </nav>
  );
}
