"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  FilterX,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { BookingAddPaymentModal } from "@/components/bookings/booking-add-payment-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  checkoutBookingClient,
  createTransactionClient,
  fetchBookingsClient,
  fetchTransactionsClient,
  fetchUsersClient,
  type BookingDto,
  type RoomTypeDto,
  type RoomWithTypeDto,
  type StaffUserDto,
  type TransactionDto,
} from "@/lib/api/apiService";
import {
  deriveBookingUiStatus,
  derivePaymentUiStatus,
  sumCompletedPayments,
  type BookingUiStatus,
  type PaymentUiStatus,
} from "@/lib/bookings/booking-ui";
import { paginateArray } from "@/lib/pagination";
import { useUrlPagination } from "@/lib/use-url-pagination";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass =
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

const Q = "q";
const FROM = "from";
const TO = "to";
const BSTAT = "bstat";
const PSTAT = "pstat";
const ROOM = "room";
const RTYPE = "rtype";
const BOOKED_BY = "by";
/** Must match `pageParam` passed to `useUrlPagination` — cleared in the same `router.replace` as filters so a second replace cannot drop new query keys. */
const PAGE_PARAM = "page";

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatMoneyFromDecimalString(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function parseMoney(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function bookingRef(booking: BookingDto): string {
  const raw = booking.id.replace(/-/g, "").toUpperCase();
  return raw.length >= 8 ? `BK-${raw.slice(0, 8)}` : `BK-${raw}`;
}

function bookingUiStatusLabel(status: BookingUiStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "checked_in":
      return "Checked in";
    case "checked_out":
      return "Checked out";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function bookingUiBadgeClass(status: BookingUiStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100";
    case "confirmed":
      return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-50";
    case "checked_in":
      return "border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-50";
    case "checked_out":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-50";
    default:
      return "";
  }
}

function paymentUiBadgeClass(status: PaymentUiStatus): string {
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50";
    case "partial":
      return "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-50";
    case "unpaid":
      return "border-slate-200 bg-slate-50 text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/80";
    default:
      return "";
  }
}

function paymentUiLabel(status: PaymentUiStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "unpaid":
      return "Unpaid";
    default:
      return status;
  }
}

type BookingsListClientProps = {
  initialBookings: BookingDto[];
  initialRoomTypes: RoomTypeDto[];
  initialRooms: RoomWithTypeDto[];
  loadError: string | null;
};

export function BookingsListClient({
  initialBookings,
  initialRoomTypes,
  initialRooms,
  loadError,
}: BookingsListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageSize = 10;
  const { state: paging, setPage } = useUrlPagination({ pageSize, pageParam: PAGE_PARAM });

  const [bookings, setBookings] = useState<BookingDto[]>(initialBookings);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);

  const [error, setError] = useState<string | null>(loadError);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const appliedQ = useMemo(() => searchParams.get(Q) ?? "", [searchParams]);
  const [draftQ, setDraftQ] = useState(() => appliedQ);

  const filters = useMemo(() => {
    return {
      from: searchParams.get(FROM) ?? "",
      to: searchParams.get(TO) ?? "",
      bstat: (searchParams.get(BSTAT) ?? "") as "" | BookingUiStatus,
      pstat: (searchParams.get(PSTAT) ?? "") as "" | PaymentUiStatus,
      roomId: searchParams.get(ROOM) ?? "",
      roomTypeId: searchParams.get(RTYPE) ?? "",
      bookedBy: searchParams.get(BOOKED_BY) ?? "",
    };
  }, [searchParams]);

  const replaceQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setFilter = useCallback(
    (patch: Partial<Record<typeof FROM | typeof TO | typeof BSTAT | typeof PSTAT | typeof ROOM | typeof RTYPE | typeof BOOKED_BY, string>>) => {
      replaceQuery((params) => {
        for (const [k, v] of Object.entries(patch) as Array<[string, string]>) {
          if (!v) params.delete(k);
          else params.set(k, v);
        }
        params.delete(PAGE_PARAM);
      });
    },
    [replaceQuery],
  );

  const clearFilters = useCallback(() => {
    replaceQuery((params) => {
      params.delete(Q);
      params.delete(FROM);
      params.delete(TO);
      params.delete(BSTAT);
      params.delete(PSTAT);
      params.delete(ROOM);
      params.delete(RTYPE);
      params.delete(BOOKED_BY);
      params.delete(PAGE_PARAM);
    });
    setDraftQ("");
  }, [replaceQuery]);

  const applySearchToUrl = useCallback(() => {
    const next = draftQ.trim();
    setDraftQ(next);
    replaceQuery((params) => {
      if (!next) params.delete(Q);
      else params.set(Q, next);
      params.delete(PAGE_PARAM);
    });
  }, [draftQ, replaceQuery]);

  useEffect(() => {
    setDraftQ(appliedQ);
  }, [appliedQ]);

  const paidByBookingId = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookings) {
      m.set(b.id, sumCompletedPayments(transactions, b.id));
    }
    return m;
  }, [bookings, transactions]);

  const filtered = useMemo(() => {
    const q = appliedQ.trim().toLowerCase();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;

    return bookings
      .filter((b) => {
        if (filters.bookedBy && (b.createdById ?? "") !== filters.bookedBy) return false;
        if (filters.roomId && b.roomId !== filters.roomId) return false;
        if (filters.roomTypeId && b.room.roomTypeId !== filters.roomTypeId) return false;

        if (from && new Date(b.checkOut).getTime() < from.getTime()) return false;
        if (to && new Date(b.checkIn).getTime() > to.getTime()) return false;

        const ui = deriveBookingUiStatus(b);
        if (filters.bstat && ui !== filters.bstat) return false;

        const paid = paidByBookingId.get(b.id) ?? 0;
        const pui = derivePaymentUiStatus(b.totalPrice, paid);
        if (filters.pstat && pui !== filters.pstat) return false;

        if (!q) return true;
        const hay = `${bookingRef(b)} ${b.id} ${b.customer.fullName} ${b.customer.email ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [appliedQ, bookings, filters, paidByBookingId]);

  const { items: paged, meta } = useMemo(() => paginateArray(filtered, paging), [filtered, paging]);

  useEffect(() => {
    if (meta.page > meta.totalPages) setPage(meta.totalPages, filtered.length);
  }, [filtered.length, meta.page, meta.totalPages, setPage]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [nextBookings, nextTx] = await Promise.all([fetchBookingsClient(), fetchTransactionsClient()]);
      setBookings(nextBookings);
      setTransactions(nextTx);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh bookings.");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setBootstrapping(true);

    void (async () => {
      try {
        const nextTx = await fetchTransactionsClient();
        if (!cancelled) setTransactions(nextTx);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load payments.");
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [paymentTarget, setPaymentTarget] = useState<BookingDto | null>(null);

  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  async function handleCheckout(booking: BookingDto) {
    setRowBusyId(booking.id);
    setError(null);
    try {
      const updated = await checkoutBookingClient(booking.id);
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check out booking.");
    } finally {
      setRowBusyId(null);
    }
  }

  const hasActiveFilters =
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.bstat) ||
    Boolean(filters.pstat) ||
    Boolean(filters.roomId) ||
    Boolean(filters.roomTypeId) ||
    Boolean(filters.bookedBy) ||
    Boolean(appliedQ.trim());

  const [staffUsers, setStaffUsers] = useState<StaffUserDto[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffLoadError, setStaffLoadError] = useState<string | null>(null);
  const staffById = useMemo(() => new Map(staffUsers.map((u) => [u.id, u])), [staffUsers]);
  const [bookedByQuery, setBookedByQuery] = useState("");
  const [bookedByOpen, setBookedByOpen] = useState(false);
  const bookedByWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStaffLoading(true);
    setStaffLoadError(null);
    void fetchUsersClient()
      .then((u) => {
        if (!cancelled) setStaffUsers(u);
      })
      .catch((e) => {
        if (!cancelled) setStaffLoadError(e instanceof Error ? e.message : "Could not load staff users.");
      })
      .finally(() => {
        if (!cancelled) setStaffLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const el = bookedByWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setBookedByOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDocPointerDown, { capture: true });
  }, []);

  const selectedBookedBy = useMemo(() => {
    const id = filters.bookedBy;
    if (!id) return null;
    return staffById.get(id) ?? null;
  }, [filters.bookedBy, staffById]);

  useEffect(() => {
    if (selectedBookedBy) {
      const label = selectedBookedBy.fullName || selectedBookedBy.username;
      setBookedByQuery(label);
      return;
    }
    if (!filters.bookedBy) setBookedByQuery("");
  }, [filters.bookedBy, selectedBookedBy]);

  const staffMatches = useMemo(() => {
    const q = bookedByQuery.trim().toLowerCase();
    const list = staffUsers.slice().sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));
    if (!q) return list;
    return list.filter((u) => `${u.fullName ?? ""} ${u.username ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q));
  }, [bookedByQuery, staffUsers]);

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div
          className={cn(
            "flex min-h-[3rem] min-w-0 flex-1 items-center gap-3 rounded-full px-5 py-2.5 ring-0",
            "bg-[#f4f4f7] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[rgb(255_255_255/0.06)]",
            "dark:shadow-[0px_8px_28px_rgba(0,0,0,0.2)]",
          )}
        >
          <Search className="size-[1.05rem] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearchToUrl();
            }}
            placeholder="Search by guest, email, or booking id…"
            className="w-full bg-transparent text-[0.875rem] text-foreground outline-none placeholder:text-muted-foreground dark:text-white"
          />
          <Button
            type="button"
            variant="ghost"
            className="h-9 shrink-0 rounded-full px-4 text-xs font-semibold"
            onClick={() => applySearchToUrl()}
          >
            Apply
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full border-0 bg-white/80 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
            onClick={() => void refreshAll()}
            disabled={refreshing || bootstrapping}
          >
            <RefreshCw className={cn("mr-2 size-4", refreshing ? "animate-spin" : "")} strokeWidth={2} />
            Refresh
          </Button>
          <Link
            href="/bookings/new"
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex h-11 items-center rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-6 text-[#0d1322] shadow-[0_10px_32px_rgb(0_204_255/0.3)] hover:from-[#33d6ff] hover:to-[#00b4ea]",
            )}
          >
            New booking
            <ArrowUpRight className="ml-2 size-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <section
        className={cn(
          "rounded-3xl p-5 ring-0 sm:p-6",
          "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
          "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground dark:text-[#9aa8bc]" strokeWidth={1.75} />
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground dark:text-white">Filters</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">
              Narrow reservations by stay window, fulfillment, settlement, and room inventory.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-9 self-start rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground dark:text-[#a8b4c4] dark:hover:text-white"
            onClick={() => clearFilters()}
            disabled={!hasActiveFilters}
          >
            <FilterX className="mr-2 size-4" strokeWidth={2} />
            Clear
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="flt-from">
              Check-in from
            </label>
            <input
              id="flt-from"
              type="date"
              className={fieldClass}
              value={filters.from}
              onChange={(e) => setFilter({ [FROM]: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-to">
              Check-out to
            </label>
            <input
              id="flt-to"
              type="date"
              className={fieldClass}
              value={filters.to}
              onChange={(e) => setFilter({ [TO]: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-bstat">
              Booking status
            </label>
            <select
              id="flt-bstat"
              className={cn(fieldClass, "cursor-pointer")}
              value={filters.bstat}
              onChange={(e) => setFilter({ [BSTAT]: e.target.value })}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-pstat">
              Payment status
            </label>
            <select
              id="flt-pstat"
              className={cn(fieldClass, "cursor-pointer")}
              value={filters.pstat}
              onChange={(e) => setFilter({ [PSTAT]: e.target.value })}
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-by">
              Booked by user
            </label>
            <div ref={bookedByWrapRef} className="relative">
              <div className="relative">
                <input
                  id="flt-by"
                  className={cn(fieldClass, "pr-20")}
                  value={bookedByQuery}
                  onChange={(e) => {
                    setBookedByQuery(e.target.value);
                    setFilter({ [BOOKED_BY]: "" });
                    setBookedByOpen(true);
                  }}
                  onFocus={() => setBookedByOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setBookedByOpen(false);
                      return;
                    }
                    if (e.key === "Enter") {
                      if (!bookedByOpen) return;
                      const first = staffMatches[0];
                      if (first) {
                        e.preventDefault();
                        setFilter({ [BOOKED_BY]: first.id });
                        setBookedByQuery(first.fullName || first.username);
                        setBookedByOpen(false);
                      }
                    }
                  }}
                  placeholder={staffLoading ? "Loading staff…" : "Search staff user…"}
                  disabled={staffLoading}
                  autoComplete="off"
                  aria-expanded={bookedByOpen}
                  aria-controls="flt-by-list"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                  {filters.bookedBy || bookedByQuery.trim() ? (
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-white"
                      onClick={() => {
                        setFilter({ [BOOKED_BY]: "" });
                        setBookedByQuery("");
                        setBookedByOpen(true);
                      }}
                      title="Clear"
                    >
                      <X className="size-4" strokeWidth={2} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-white"
                    onClick={() => setBookedByOpen((v) => !v)}
                    title="Toggle list"
                    disabled={staffLoading}
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", bookedByOpen ? "rotate-180" : "")}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>

              {bookedByOpen ? (
                <div
                  id="flt-by-list"
                  role="listbox"
                  className={cn(
                    "absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_60px_rgb(15_23_42/0.08)]",
                    "dark:border-white/10 dark:bg-[rgb(22_28_42/0.98)] dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)]",
                  )}
                >
                  <ScrollArea className="max-h-64">
                    <div className="p-1.5">
                      {staffLoadError ? (
                        <div className="px-3 py-3 text-sm text-destructive dark:text-red-200">{staffLoadError}</div>
                      ) : staffMatches.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground dark:text-[#a8b4c4]">
                          No matching staff users.
                        </div>
                      ) : (
                        staffMatches.slice(0, 60).map((u) => {
                          const active = u.id === filters.bookedBy;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => {
                                setFilter({ [BOOKED_BY]: u.id });
                                setBookedByQuery(u.fullName || u.username);
                                setBookedByOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                active
                                  ? "bg-cyan-50 text-foreground dark:bg-white/[0.06] dark:text-white"
                                  : "hover:bg-muted/50 dark:hover:bg-white/[0.06]",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-foreground dark:text-white">
                                  {u.fullName || u.username}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground dark:text-[#a8b4c4]">
                                  {u.username}
                                  {u.email ? ` · ${u.email}` : ""}
                                </span>
                              </span>
                              {active ? (
                                <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-rtype">
              Room type
            </label>
            <select
              id="flt-rtype"
              className={cn(fieldClass, "cursor-pointer")}
              value={filters.roomTypeId}
              onChange={(e) => setFilter({ [RTYPE]: e.target.value, [ROOM]: "" })}
            >
              <option value="">All types</option>
              {initialRoomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="flt-room">
              Room
            </label>
            <select
              id="flt-room"
              className={cn(fieldClass, "cursor-pointer")}
              value={filters.roomId}
              onChange={(e) => setFilter({ [ROOM]: e.target.value })}
            >
              <option value="">All rooms</option>
              {initialRooms
                .filter((r) => !filters.roomTypeId || r.roomTypeId === filters.roomTypeId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} · {r.roomType.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "overflow-hidden rounded-3xl ring-0",
          "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
          "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
        )}
      >
        <div className="px-6 pb-3 pt-7 sm:px-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">Bookings</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground dark:text-[#a8b4c4]">
            Operational ledger of stays, settlement, and room assignment — tuned for front desk workflows.
          </p>
        </div>

        <div className="px-3 pb-6 sm:px-6">
          {bootstrapping ? (
            <div className="space-y-3 px-2 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10">
              <p className="text-sm font-semibold text-foreground dark:text-white">No bookings match your filters.</p>
              <p className="mt-2 text-sm text-muted-foreground dark:text-[#9aa8bc]">
                Try widening the stay window, clearing payment filters, or resetting search.
              </p>
              <div className="mt-4">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => clearFilters()} disabled={!hasActiveFilters}>
                  Reset filters
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Reference
                  </TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Guest
                  </TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Room
                  </TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Stay
                  </TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Booking
                  </TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Payment
                  </TableHead>
                  <TableHead className="text-right text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Total
                  </TableHead>
                  <TableHead className="text-right text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((b) => {
                  const paid = paidByBookingId.get(b.id) ?? 0;
                  const pui = derivePaymentUiStatus(b.totalPrice, paid);
                  const bui = deriveBookingUiStatus(b);
                  const outstanding = Math.max(0, parseMoney(b.totalPrice) - paid);
                  const busy = rowBusyId === b.id;

                  const canCheckout =
                    b.status !== "CANCELLED" && b.status !== "COMPLETED" && b.status !== "CHECKED_OUT";

                  return (
                    <TableRow
                      key={b.id}
                      className={cn(
                        "border-0",
                        "hover:bg-muted/40 dark:hover:bg-white/[0.04]",
                        "[&>td]:align-middle",
                      )}
                    >
                      <TableCell className="font-mono text-xs text-foreground/90 dark:text-white/90">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{bookingRef(b)}</span>
                          <span className="text-[0.65rem] text-muted-foreground dark:text-white/45">{b.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground dark:text-white">{b.customer.fullName}</span>
                          <span className="text-xs text-muted-foreground dark:text-[#a8b4c4]">{b.customer.email ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground dark:text-white">Room {b.room.roomNumber}</span>
                          <span className="text-xs text-muted-foreground dark:text-[#a8b4c4]">{b.room.roomType.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground dark:text-[#c7d1db]">
                        <div className="flex flex-col gap-0.5">
                          <span>
                            <span className="font-semibold text-foreground dark:text-white">{formatShortDate(b.checkIn)}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-semibold text-foreground dark:text-white">{formatShortDate(b.checkOut)}</span>
                          </span>
                          <span className="text-xs text-muted-foreground dark:text-[#a8b4c4]">API: {b.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold", bookingUiBadgeClass(bui))}>
                          {bookingUiStatusLabel(bui)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={cn("w-fit rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold", paymentUiBadgeClass(pui))}>
                            {paymentUiLabel(pui)}
                          </Badge>
                          <span className="text-[0.7rem] text-muted-foreground dark:text-white/45">
                            Paid {formatMoneyFromDecimalString(paid.toFixed(2))} / {formatMoneyFromDecimalString(b.totalPrice)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground dark:text-white">
                        {formatMoneyFromDecimalString(b.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/bookings/${b.id}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "inline-flex h-8 items-center rounded-full border-0 bg-white/70 px-3 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]",
                            )}
                          >
                            <Eye className="mr-1.5 size-3.5" strokeWidth={2} />
                            View
                          </Link>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-0 bg-white/70 px-3 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                            disabled
                            title="There is no dedicated check-in endpoint yet; confirmed bookings occupy the room on creation."
                          >
                            <LogIn className="mr-1.5 size-3.5" strokeWidth={2} />
                            Check-in
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-0 bg-white/70 px-3 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                            disabled={!canCheckout || busy}
                            onClick={() => void handleCheckout(b)}
                            title={!canCheckout ? "This booking is already closed." : "Check out guest and release the room."}
                          >
                            <LogOut className="mr-1.5 size-3.5" strokeWidth={2} />
                            {busy ? "…" : "Out"}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-0 bg-white/70 px-3 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                            disabled={outstanding <= 0}
                            onClick={() => setPaymentTarget(b)}
                            title={outstanding <= 0 ? "Balance is fully settled." : "Record a payment against this booking."}
                          >
                            <CreditCard className="mr-1.5 size-3.5" strokeWidth={2} />
                            Pay
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-0 bg-white/70 px-3 text-xs font-semibold shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                            disabled
                            title="Booking edits are not supported by the API yet."
                          >
                            <Pencil className="mr-1.5 size-3.5" strokeWidth={2} />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!bootstrapping && filtered.length > 0 ? (
            <div className="px-3 pt-4 sm:px-4">
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                totalItems={meta.totalItems}
                pageSize={meta.pageSize}
                onPageChange={(p) => setPage(p, filtered.length)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <BookingAddPaymentModal
        open={paymentTarget !== null}
        onOpenChange={(o) => {
          if (!o) setPaymentTarget(null);
        }}
        bookingLabel={paymentTarget ? `${bookingRef(paymentTarget)} · ${paymentTarget.customer.fullName}` : ""}
        outstandingUsd={paymentTarget ? Math.max(0, parseMoney(paymentTarget.totalPrice) - (paidByBookingId.get(paymentTarget.id) ?? 0)) : 0}
        onSubmit={async ({ amount, paymentMethod }) => {
          if (!paymentTarget) return;
          const created = await createTransactionClient({ bookingId: paymentTarget.id, amount, paymentMethod });
          setTransactions((prev) => [created, ...prev]);
          router.refresh();
        }}
      />
    </div>
  );
}
