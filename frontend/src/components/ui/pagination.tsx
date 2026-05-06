"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pageWindow } from "@/lib/pagination";

export type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** If provided, shown as "Showing X–Y of Z". */
  pageSize?: number;
  /** 3–7 recommended. */
  maxButtons?: number;
};

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
  maxButtons,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages));
  const safePage = Math.min(Math.max(1, Math.floor(page)), safeTotalPages);

  const { pages, showLeftEllipsis, showRightEllipsis } = pageWindow({
    page: safePage,
    totalPages: safeTotalPages,
    maxButtons,
  });

  const canPrev = safePage > 1;
  const canNext = safePage < safeTotalPages;

  const range =
    totalItems !== undefined && pageSize !== undefined
      ? {
          start: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
          end: Math.min(totalItems, safePage * pageSize),
        }
      : null;

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-sm text-muted-foreground">
        {range ? (
          <span>
            Showing <span className="font-medium text-foreground">{range.start}</span>–
            <span className="font-medium text-foreground">{range.end}</span> of{" "}
            <span className="font-medium text-foreground">{totalItems}</span>
          </span>
        ) : (
          <span>
            Page <span className="font-medium text-foreground">{safePage}</span> of{" "}
            <span className="font-medium text-foreground">{safeTotalPages}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 size-4" strokeWidth={2} />
          Previous
        </Button>

        <div className="hidden items-center gap-1.5 sm:flex">
          {(() => {
            const nodes: ReactNode[] = [];

            for (let i = 0; i < pages.length; i += 1) {
              const p = pages[i]!;
              const prev = pages[i - 1];

              if (prev !== undefined && p - prev > 1) {
                const isLeftGap = prev === 1;
                const shouldEllipsis = isLeftGap ? showLeftEllipsis : showRightEllipsis;
                if (shouldEllipsis) {
                  nodes.push(
                    <span key={`ellipsis-${prev}-${p}`} className="px-1 text-muted-foreground" aria-hidden>
                      <MoreHorizontal className="size-4" />
                    </span>,
                  );
                }
              }

              nodes.push(
                <Button
                  key={`page-${p}-${i}`}
                  type="button"
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  className={cn("min-w-9 rounded-full px-3", p === safePage ? "" : "bg-transparent")}
                  onClick={() => onPageChange(p)}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p}
                </Button>,
              );
            }

            return nodes;
          })()}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="ml-1 size-4" strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}

