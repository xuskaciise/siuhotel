"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CreditCard,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";

import { BookingAddPaymentModal } from "@/components/bookings/booking-add-payment-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  checkoutBookingClient,
  createTransactionClient,
  fetchBookingClient,
  fetchTransactionsClient,
  type BookingDto,
  type PaymentMethod,
  type TransactionDto,
} from "@/lib/api/apiService";
import {
  bookingApiStatusLabel,
  deriveBookingUiStatus,
  derivePaymentUiStatus,
  sumCompletedPayments,
  type PaymentUiStatus,
} from "@/lib/bookings/booking-ui";
import { cn } from "@/lib/utils";

const cardShell = cn(
  "rounded-3xl ring-0",
  "bg-white/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] dark:bg-[rgb(22_28_42/0.9)]",
  "dark:shadow-[0_24px_70px_rgb(0_0_0/0.35)] dark:backdrop-blur-[20px]",
);

function formatShortDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

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

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil(ms / dayMs));
}

function paymentMethodLabel(m: PaymentMethod): string {
  switch (m) {
    case "CASH":
      return "Cash";
    case "EVC_PLUS":
      return "EVC Plus";
    case "PREMIER_BANK":
      return "Premier Bank";
    case "SAHAL":
      return "Sahal";
    default:
      return m;
  }
}

function transactionRef(id: string): string {
  const clean = id.replace(/-/g, "").toUpperCase();
  return clean.length >= 10 ? `TX-${clean.slice(0, 10)}` : `TX-${clean}`;
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

type BookingDetailClientProps = {
  bookingId: string;
  initialBooking: BookingDto | null;
  loadError: string | null;
};

export function BookingDetailClient({ bookingId, initialBooking, loadError }: BookingDetailClientProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDto | null>(initialBooking);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [error, setError] = useState<string | null>(loadError);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  /** Staff reference keyed by transaction id — session only (API has no note field). */
  const [staffRefByTxId, setStaffRefByTxId] = useState<Record<string, string>>({});

  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking]);

  const bookingTxs = useMemo(
    () => transactions.filter((t) => t.bookingId === bookingId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, bookingId],
  );

  const paid = useMemo(() => (booking ? sumCompletedPayments(transactions, booking.id) : 0), [booking, transactions]);
  const total = booking ? parseMoney(booking.totalPrice) : 0;
  const remaining = Math.max(0, total - paid);
  const pStatus = booking ? derivePaymentUiStatus(booking.totalPrice, paid) : "unpaid";
  const uiStatus = booking ? deriveBookingUiStatus(booking) : "pending";

  const refreshAll = useCallback(async () => {
    if (!bookingId) return;
    setRefreshing(true);
    setError(null);
    try {
      const [b, tx] = await Promise.all([fetchBookingClient(bookingId), fetchTransactionsClient()]);
      setBooking(b);
      setTransactions(tx);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    void (async () => {
      try {
        const tx = await fetchTransactionsClient();
        setTransactions(tx);
      } catch {
        setTransactions([]);
      }
    })();
  }, [bookingId]);

  async function handleCheckout() {
    if (!booking) return;
    setCheckoutBusy(true);
    setError(null);
    setPaymentSuccess(null);
    try {
      const updated = await checkoutBookingClient(booking.id);
      setBooking(updated);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-out failed.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (!booking && error) {
    return (
      <div className={cn(cardShell, "p-8")}>
        <p className="text-sm font-medium text-destructive dark:text-red-300" role="alert">
          {error}
        </p>
        <Link
          href="/bookings"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-6 inline-flex rounded-full border-0 bg-white/80 px-4 dark:bg-white/[0.08]",
          )}
        >
          <ArrowLeft className="mr-2 size-4" strokeWidth={2} />
          Back to bookings
        </Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={cn(cardShell, "p-8")}>
        <p className="text-sm text-muted-foreground">No booking data.</p>
        <Link href="/bookings" className={cn(buttonVariants({ variant: "link" }), "mt-4 px-0")}>
          Back to list
        </Link>
      </div>
    );
  }

  const canCheckout = booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.status !== "CHECKED_OUT";
  const nights = nightsBetween(new Date(booking.checkIn), new Date(booking.checkOut));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/bookings"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-10 items-center rounded-full border-0 bg-white/80 px-4 text-xs font-semibold shadow-sm dark:bg-white/[0.06] dark:text-white",
          )}
        >
          <ArrowLeft className="mr-2 size-4" strokeWidth={2} />
          All bookings
        </Link>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full border-0 bg-white/80 text-xs font-semibold dark:bg-white/[0.06] dark:text-white"
          onClick={() => void refreshAll()}
          disabled={refreshing}
        >
          <RefreshCw className={cn("mr-2 size-4", refreshing ? "animate-spin" : "")} strokeWidth={2} />
          Refresh
        </Button>
      </div>

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

      {paymentSuccess ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50"
          role="status"
        >
          {paymentSuccess}
        </div>
      ) : null}

      <section className={cn(cardShell, "p-6 sm:p-8")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-[#8a97a8]">Booking</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground dark:text-white sm:text-3xl">
              {bookingRef(booking)}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground dark:text-white/50">{booking.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
              API: {bookingApiStatusLabel(booking.status)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
              Stay: {uiStatus.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Guest</p>
            <p className="mt-3 text-lg font-semibold text-foreground dark:text-white">{booking.customer.fullName}</p>
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground dark:text-[#a8b4c4]">
              <div className="flex justify-between gap-4">
                <dt>Phone</dt>
                <dd className="text-right font-medium text-foreground dark:text-white">{booking.customer.phoneNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Email</dt>
                <dd className="text-right font-medium text-foreground dark:text-white">{booking.customer.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>ID / passport</dt>
                <dd className="text-right font-medium text-foreground dark:text-white">{booking.customer.idCard ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/10 p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Room</p>
            <p className="mt-3 text-lg font-semibold text-foreground dark:text-white">Room {booking.room.roomNumber}</p>
            <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">{booking.room.roomType.name}</p>
            <p className="mt-3 text-xs text-muted-foreground dark:text-white/50">Room status: {booking.room.status}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/10 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]">Stay</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-white">
                {formatShortDate(booking.checkIn)} → {formatShortDate(booking.checkOut)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">
                {nights} night{nights === 1 ? "" : "s"} · {formatShortDateTime(booking.createdAt)} created
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-0 bg-white/80 dark:bg-white/[0.06]"
            disabled
            title="No check-in API; occupancy is applied when the booking is confirmed on create."
          >
            <LogIn className="mr-2 size-4" strokeWidth={2} />
            Check-in
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-0 bg-white/80 dark:bg-white/[0.06]"
            disabled={!canCheckout || checkoutBusy}
            onClick={() => void handleCheckout()}
            title={!canCheckout ? "Booking is already closed." : "Complete stay and release room."}
          >
            {checkoutBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" strokeWidth={2} />}
            Check-out
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-0 bg-white/80 dark:bg-white/[0.06]"
            disabled={remaining <= 0}
            onClick={() => {
              setPaymentSuccess(null);
              setPaymentOpen(true);
            }}
          >
            <CreditCard className="mr-2 size-4" strokeWidth={2} />
            Add payment
          </Button>
          <Link
            href={`/bookings/${booking.id}/invoice`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex h-8 items-center rounded-full border-0 bg-white/80 dark:bg-white/[0.06]",
            )}
          >
            <FileText className="mr-2 size-4" strokeWidth={2} />
            Invoice
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-0 bg-white/80 dark:bg-white/[0.06]"
            disabled
            title="Cancel booking is not exposed on the API."
          >
            <Ban className="mr-2 size-4" strokeWidth={2} />
            Cancel
          </Button>
        </div>
      </section>

      <section className={cn(cardShell, "p-6 sm:p-8")}>
        <h2 className="font-display text-lg font-semibold text-foreground dark:text-white">Payment summary</h2>
        <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">Totals come from the booking record; paid balance sums completed transactions.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 to-white p-5 dark:border-cyan-500/20 dark:from-cyan-500/10 dark:to-transparent">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-900/80 dark:text-cyan-100/80">Total</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground dark:text-white">{formatMoneyFromDecimalString(booking.totalPrice)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-transparent">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-900/80 dark:text-emerald-100/80">Paid</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground dark:text-white">{formatMoneyFromDecimalString(paid.toFixed(2))}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-transparent">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-900/80 dark:text-amber-100/80">Remaining</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground dark:text-white">{formatMoneyFromDecimalString(remaining.toFixed(2))}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground dark:text-[#a8b4c4]">Payment status</span>
          <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-xs font-semibold", paymentUiBadgeClass(pStatus))}>
            {paymentUiLabel(pStatus)}
          </Badge>
        </div>
      </section>

      <section className={cn(cardShell, "overflow-hidden p-6 sm:p-8")}>
        <h2 className="font-display text-lg font-semibold text-foreground dark:text-white">Payment history</h2>
        <p className="mt-1 text-sm text-muted-foreground dark:text-[#a8b4c4]">All transactions linked to this booking.</p>

        <div className="mt-6 overflow-x-auto">
          {bookingTxs.length === 0 ? (
            <p className="text-sm text-muted-foreground dark:text-[#9aa8bc]">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">Amount</TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">Method</TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">Date</TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">Reference</TableHead>
                  <TableHead className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground dark:text-[#8a97a8]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingTxs.map((tx) => (
                  <TableRow key={tx.id} className="border-0 hover:bg-muted/40 dark:hover:bg-white/[0.04]">
                    <TableCell className="font-semibold tabular-nums text-foreground dark:text-white">
                      {tx.status === "REFUNDED" ? "−" : ""}
                      {formatMoneyFromDecimalString(tx.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground dark:text-[#c7d1db]">{paymentMethodLabel(tx.paymentMethod)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground dark:text-[#c7d1db]">{formatShortDateTime(tx.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground/90 dark:text-white/85">
                      {staffRefByTxId[tx.id] ? (
                        <span>
                          <span className="font-semibold">{staffRefByTxId[tx.id]}</span>
                          <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">{transactionRef(tx.id)}</span>
                        </span>
                      ) : (
                        transactionRef(tx.id)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full text-[0.7rem]">
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <BookingAddPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        bookingLabel={`${bookingRef(booking)} · ${booking.customer.fullName}`}
        outstandingUsd={remaining}
        showStaffReferenceField
        onSubmit={async ({ amount, paymentMethod, staffReference }) => {
          const created = await createTransactionClient({
            bookingId: booking.id,
            amount,
            paymentMethod,
            status: "COMPLETED",
          });
          setTransactions((prev) => [created, ...prev]);
          if (staffReference) {
            setStaffRefByTxId((prev) => ({ ...prev, [created.id]: staffReference }));
          }
          setPaymentSuccess(`Payment of ${formatMoneyFromDecimalString(created.amount)} recorded (${paymentMethodLabel(created.paymentMethod)}).`);
          router.refresh();
        }}
      />
    </div>
  );
}
