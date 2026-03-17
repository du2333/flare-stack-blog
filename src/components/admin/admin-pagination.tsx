import React from "react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  currentPageItemCount: number;
  onPageChange: (page: number) => void;
}

/** Generate smart page numbers with ellipsis */
function getPageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  currentPageItemCount,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(startItem + currentPageItemCount - 1, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border/30 mt-8">
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {m.admin_pagination_info({
          startItem,
          endItem,
          totalItems,
        })}
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 rounded-none border-border/30 hover:bg-foreground hover:text-background hover:border-foreground transition-all disabled:opacity-20"
        >
          <span className="font-mono text-xs font-bold">{"<"}</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 px-2">
          {pageNumbers.map((pageNumber, index) => (
            <React.Fragment key={index}>
              {pageNumber === "..." ? (
                <div className="w-8 text-center text-[10px] text-muted-foreground font-mono">
                  ...
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className={`h-8 w-8 p-0 rounded-none font-mono text-xs transition-colors ${
                    currentPage === pageNumber
                      ? "bg-foreground text-background font-bold hover:bg-foreground hover:text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent underline decoration-border/30 hover:decoration-foreground underline-offset-4"
                  }`}
                >
                  {pageNumber}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 rounded-none border-border/30 hover:bg-foreground hover:text-background hover:border-foreground transition-all disabled:opacity-20"
        >
          <span className="font-mono text-xs font-bold">{">"}</span>
        </Button>
      </div>
    </div>
  );
}
