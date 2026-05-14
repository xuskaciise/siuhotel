export type PaginationState = {
  page: number;
  pageSize: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  if (!Number.isFinite(totalPages) || totalPages < 1) return 1;
  return Math.min(Math.max(1, Math.floor(page)), Math.floor(totalPages));
}

export function totalPagesFor(totalItems: number, pageSize: number): number {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const safeTotal = Math.max(0, Math.floor(totalItems));
  return Math.max(1, Math.ceil(safeTotal / safeSize));
}

export function paginateArray<T>(
  items: T[],
  state: PaginationState,
): { items: T[]; meta: PaginationMeta } {
  const totalItems = items.length;
  const totalPages = totalPagesFor(totalItems, state.pageSize);
  const page = clampPage(state.page, totalPages);
  const start = (page - 1) * state.pageSize;
  const end = start + state.pageSize;
  return {
    items: items.slice(start, end),
    meta: { page, pageSize: state.pageSize, totalItems, totalPages },
  };
}

export function pageWindow(params: {
  page: number;
  totalPages: number;
  /** Max page buttons excluding first/last. */
  maxButtons?: number;
}): { pages: number[]; showLeftEllipsis: boolean; showRightEllipsis: boolean } {
  const maxButtons = Math.max(3, Math.floor(params.maxButtons ?? 5));
  const totalPages = Math.max(1, Math.floor(params.totalPages));
  const page = clampPage(params.page, totalPages);

  if (totalPages <= maxButtons + 2) {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return { pages, showLeftEllipsis: false, showRightEllipsis: false };
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(2, page - half);
  let end = Math.min(totalPages - 1, page + half);

  const desired = maxButtons;
  const have = end - start + 1;
  if (have < desired) {
    const deficit = desired - have;
    start = Math.max(2, start - deficit);
    end = Math.min(totalPages - 1, end + deficit);
  }

  // Re-clamp after expansion.
  start = Math.max(2, Math.min(start, totalPages - 1));
  end = Math.max(start, Math.min(end, totalPages - 1));

  const pages = [1, ...Array.from({ length: end - start + 1 }, (_, i) => start + i), totalPages];
  return {
    pages,
    showLeftEllipsis: start > 2,
    showRightEllipsis: end < totalPages - 1,
  };
}

