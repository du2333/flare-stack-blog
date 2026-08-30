import React from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  currentPageItemCount: number;
  onPageChange: (page: number) => void;
}

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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div className="text-sm fuwari-text-50">
        {m.admin_pagination_info({
          startItem,
          endItem,
          totalItems,
        })}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="fuwari-btn-regular rounded-xl h-8 w-8 text-sm disabled:opacity-40"
        >
          {"<"}
        </button>

        {pageNumbers.map((pageNumber, index) => (
          <React.Fragment key={index}>
            {pageNumber === "..." ? (
              <div className="w-8 text-center text-sm fuwari-text-50">...</div>
            ) : (
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  "rounded-xl h-8 w-8 text-sm",
                  currentPage === pageNumber
                    ? "fuwari-btn-primary"
                    : "fuwari-btn-regular",
                )}
              >
                {pageNumber}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="fuwari-btn-regular rounded-xl h-8 w-8 text-sm disabled:opacity-40"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}
