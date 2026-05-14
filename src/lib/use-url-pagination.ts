"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { clampPage, totalPagesFor, type PaginationState } from "@/lib/pagination";

type Params = {
  pageSize: number;
  /** Query param name, default "page". */
  pageParam?: string;
};

export function useUrlPagination({ pageSize, pageParam = "page" }: Params) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = searchParams.get(pageParam);
    const n = raw ? Number.parseInt(raw, 10) : 1;
    return Number.isFinite(n) ? n : 1;
  }, [searchParams, pageParam]);

  const state: PaginationState = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  function setPage(nextPage: number, totalItems?: number) {
    const totalPages =
      totalItems !== undefined ? totalPagesFor(totalItems, pageSize) : Number.POSITIVE_INFINITY;
    const clamped = totalItems !== undefined ? clampPage(nextPage, totalPages) : Math.max(1, Math.floor(nextPage));

    const params = new URLSearchParams(searchParams.toString());
    if (clamped <= 1) params.delete(pageParam);
    else params.set(pageParam, String(clamped));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function reset() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(pageParam);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return { state, setPage, reset };
}

