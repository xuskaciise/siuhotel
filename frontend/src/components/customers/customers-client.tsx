"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { CustomerUpsertModal } from "@/components/customers/customer-upsert-modal";
import { GlassModal } from "@/components/rooms/glass-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteCustomerClient,
  fetchCustomersClient,
  listCustomerStorageKeysClient,
  presignAssetUrlsClient,
  type CustomerDto,
} from "@/lib/api/apiService";
import { paginateArray } from "@/lib/pagination";
import { useUrlPagination } from "@/lib/use-url-pagination";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

type CustomersClientProps = {
  initialCustomers: CustomerDto[];
  loadError: string | null;
};

export function CustomersClient({ initialCustomers, loadError }: CustomersClientProps) {
  const [rows, setRows] = useState<CustomerDto[]>(initialCustomers);
  const [error, setError] = useState<string | null>(loadError);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrlByCustomerId, setAvatarUrlByCustomerId] = useState<Record<string, string>>({});
  const pageSize = 12;
  const { state: paging, setPage, reset: resetPage } = useUrlPagination({ pageSize, pageParam: "page" });

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerDto | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => `${c.fullName} ${c.email ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  const { items: paged, meta } = useMemo(() => paginateArray(filtered, paging), [filtered, paging]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const subset = paged.slice(0, 24);
      const missing = subset.filter((c) => avatarUrlByCustomerId[c.id] === undefined);
      if (missing.length === 0) return;

      // Fetch first image key per customer, then presign in one batch.
      const firstKeyById: Record<string, string> = {};
      const keys: string[] = [];

      // Small concurrency to avoid hammering the backend.
      const limit = 6;
      let idx = 0;
      const workers = Array.from({ length: Math.min(limit, missing.length) }, async () => {
        while (idx < missing.length) {
          const i = idx++;
          const c = missing[i]!;
          try {
            const storageKeys = await listCustomerStorageKeysClient(c.id);
            const first = storageKeys[0];
            if (first) {
              firstKeyById[c.id] = first;
              keys.push(first);
            }
          } catch {
            // Ignore per-row errors; fall back to initials.
          }
        }
      });

      await Promise.all(workers);
      if (cancelled || keys.length === 0) return;

      const urlByPath = await presignAssetUrlsClient(keys);
      if (cancelled) return;

      setAvatarUrlByCustomerId((prev) => {
        const next = { ...prev };
        for (const [id, path] of Object.entries(firstKeyById)) {
          const url = urlByPath[path];
          if (url) next[id] = url;
        }
        return next;
      });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [paged, avatarUrlByCustomerId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const next = await fetchCustomersClient();
      setRows(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh customers.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await deleteCustomerClient(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete customer.");
    } finally {
      setDeleteSubmitting(false);
    }
  }, [deleteTarget, refresh]);

  return (
    <div className="space-y-8">
      {error ? (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-medium ring-0",
            "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-100",
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex min-h-[3rem] min-w-0 flex-1 items-center gap-3 rounded-full px-5 py-2.5 ring-0",
            "bg-[#f4f4f7] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[rgb(255_255_255/0.06)]",
            "dark:shadow-[0px_8px_28px_rgba(0,0,0,0.2)]",
          )}
        >
          <Search className="size-[1.05rem] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search guests by name or email…"
            className="w-full bg-transparent text-[0.875rem] text-foreground outline-none placeholder:text-muted-foreground dark:text-white"
          />
          {refreshing ? <span className="text-xs font-semibold text-muted-foreground">Updating…</span> : null}
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setUpsertOpen(true);
          }}
          className={cn(
            "h-11 rounded-full border-0 px-6 font-semibold ring-0",
            "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322]",
            "shadow-[0_10px_32px_rgb(0_204_255/0.3)] hover:from-[#33d6ff] hover:to-[#00b4ea]",
          )}
        >
          <Plus className="mr-2 size-4" strokeWidth={2} />
          Add Customer
        </Button>
      </div>

      <section
        className={cn(
          "overflow-hidden rounded-3xl ring-0",
          "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
          "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
        )}
      >
        <div className="px-6 pb-3 pt-7 sm:px-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">
            Customers
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground dark:text-[#a8b4c4]">
            Profile directory with contact, ID, and registration timeline.
          </p>
        </div>

        <div className="px-3 pb-6 sm:px-6">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground dark:text-[#9aa8bc]">No customers found.</p>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-label-editorial text-table-header-warm">Full name</TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">Email address</TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">Phone number</TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">ID / Passport</TableHead>
                  <TableHead className="text-label-editorial text-table-header-warm">Reg. date</TableHead>
                  <TableHead className="w-28 text-label-editorial text-table-header-warm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-0">
                {paged.map((c, index) => (
                  <TableRow
                    key={c.id}
                    className={cn(
                      "border-0 transition-colors",
                      index % 2 === 1 ? "bg-muted/25 dark:bg-[#1a2230]/80" : "bg-transparent",
                      "hover:bg-muted/40 dark:hover:bg-[#242a3a]/90",
                    )}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 ring-0">
                          {avatarUrlByCustomerId[c.id] ? (
                            <AvatarImage src={avatarUrlByCustomerId[c.id]} alt={c.fullName} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-[0.75rem] font-semibold text-foreground dark:bg-[#2f3445] dark:text-white">
                            {initials(c.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-[0.9375rem] font-semibold text-foreground dark:text-white">
                            {c.fullName}
                          </p>
                          <p className="text-[0.75rem] text-muted-foreground">Guest</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-[0.875rem] text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <TableCell className="py-4 text-[0.875rem] text-muted-foreground">{c.phoneNumber}</TableCell>
                    <TableCell className="py-4 text-[0.875rem] text-muted-foreground">{c.idCard ?? "—"}</TableCell>
                    <TableCell className="py-4 text-[0.875rem] text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-2xl text-muted-foreground ring-0 transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                          aria-label="Edit customer"
                          onClick={() => {
                            setEditing(c);
                            setUpsertOpen(true);
                          }}
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="flex size-10 items-center justify-center rounded-2xl text-muted-foreground ring-0 transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
                          aria-label="Delete customer"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(c);
                          }}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {filtered.length > 0 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.totalItems}
          pageSize={meta.pageSize}
          onPageChange={(p) => setPage(p, meta.totalItems)}
        />
      ) : null}

      <CustomerUpsertModal
        open={upsertOpen}
        onOpenChange={(o) => {
          setUpsertOpen(o);
          if (!o) setEditing(null);
        }}
        customer={editing}
        onSaved={async () => {
          await refresh();
          resetPage();
        }}
      />

      <GlassModal
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete customer?"
        description={
          deleteTarget
            ? `Permanently remove ${deleteTarget.fullName} from the guest registry. This cannot be undone. Deletion may fail if related records exist.`
            : undefined
        }
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full border-0"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full border-0 bg-rose-600 px-6 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
              onClick={() => void confirmDelete()}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting…" : "Delete customer"}
            </Button>
          </>
        }
      >
        {deleteError ? (
          <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
            {deleteError}
          </p>
        ) : null}
      </GlassModal>
    </div>
  );
}

