"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  bookingApiStatusLabel,
  deriveBookingUiStatus,
  derivePaymentUiStatus,
  sumCompletedPayments,
} from "@/lib/bookings/booking-ui";
import type { BookingDto, HotelInfoDto, PaymentMethod, TransactionDto } from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

function formatUsd(value: string | number): string {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function formatLongDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function bookingRef(booking: BookingDto): string {
  const raw = booking.id.replace(/-/g, "").toUpperCase();
  return raw.length >= 8 ? `BK-${raw.slice(0, 8)}` : `BK-${raw}`;
}

function transactionRef(id: string): string {
  const clean = id.replace(/-/g, "").toUpperCase();
  return clean.length >= 10 ? `TX-${clean.slice(0, 10)}` : `TX-${clean}`;
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

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.ceil(ms / dayMs));
}

function parseMoney(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export type BookingInvoiceClientProps = {
  booking: BookingDto;
  transactions: TransactionDto[];
  hotel: HotelInfoDto | null;
  issuedAtIso: string;
};

export function BookingInvoiceClient({ booking, transactions, hotel, issuedAtIso }: BookingInvoiceClientProps) {
  const bookingTxs = transactions
    .filter((t) => t.bookingId === booking.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const paid = sumCompletedPayments(transactions, booking.id);
  const total = parseMoney(booking.totalPrice);
  const remaining = Math.max(0, total - paid);
  const payStatus = derivePaymentUiStatus(booking.totalPrice, paid);
  const stayLabel = deriveBookingUiStatus(booking).replaceAll("_", " ");

  const nights = nightsBetween(new Date(booking.checkIn), new Date(booking.checkOut));
  const unitNightly = parseMoney(booking.room.roomType.basePrice);
  const lineFromRate = unitNightly * nights;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/bookings/${booking.id}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-10 items-center rounded-full border-0 bg-white/80 px-4 text-xs font-semibold shadow-sm dark:bg-white/[0.06] dark:text-white",
          )}
        >
          <ArrowLeft className="mr-2 size-4" strokeWidth={2} />
          Back to booking
        </Link>
        <Button
          type="button"
          className="h-10 rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-5 text-xs font-semibold text-white shadow-md"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 size-4" strokeWidth={2} />
          Print / Save PDF
        </Button>
      </div>

      <article
        className={cn(
          "invoice-sheet mx-auto max-w-3xl rounded-2xl border border-border/70 bg-white p-8 shadow-sm",
          "text-slate-900 print:max-w-none print:border-0 print:p-0 print:shadow-none",
          "dark:border-white/10 dark:bg-[rgb(22_28_42/0.95)] dark:text-white print:dark:bg-white print:dark:text-black",
        )}
      >
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 dark:border-white/10 print:border-slate-300">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="relative h-[72px] w-[72px] shrink-0 sm:h-20 sm:w-20 print:h-[64px] print:w-[64px]">
                <Image
                  src="/siulogo.png"
                  alt="Somali International University"
                  fill
                  className="object-contain object-left"
                  sizes="80px"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
                  {hotel?.name ?? "Hotel"}
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Booking invoice</h1>
                <p className="mt-1 font-mono text-xs text-slate-500 dark:text-white/45 print:dark:text-slate-600">
                  {bookingRef(booking)} · {booking.id}
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-600 dark:text-white/70 print:dark:text-slate-700">
              <p>
                <span className="font-semibold text-slate-800 dark:text-white print:dark:text-slate-900">Issued</span>{" "}
                {formatLongDateTime(issuedAtIso)}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-800 dark:text-white print:dark:text-slate-900">Stay</span>{" "}
                {formatShortDate(booking.checkIn)} — {formatShortDate(booking.checkOut)}
              </p>
            </div>
          </div>
          {hotel ? (
            <div className="grid gap-1 text-sm text-slate-600 dark:text-white/65 print:dark:text-slate-700 sm:grid-cols-2">
              <p>{hotel.address}</p>
              <p className="sm:text-right">
                {hotel.phone} · {hotel.email}
              </p>
            </div>
          ) : null}
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
              Bill to
            </h2>
            <p className="mt-2 text-base font-semibold">{booking.customer.fullName}</p>
            <dl className="mt-2 space-y-1 text-sm text-slate-600 dark:text-white/70 print:dark:text-slate-700">
              <div className="flex justify-between gap-4">
                <dt>Phone</dt>
                <dd className="text-right font-medium">{booking.customer.phoneNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Email</dt>
                <dd className="text-right font-medium">{booking.customer.email ?? "—"}</dd>
              </div>
              {booking.customer.address ? (
                <div className="pt-1">
                  <dt className="sr-only">Address</dt>
                  <dd>{booking.customer.address}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <section>
            <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
              Reservation
            </h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-600 dark:text-white/70 print:dark:text-slate-700">
              <div className="flex justify-between gap-4">
                <dt>Room</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white print:dark:text-slate-900">
                  {booking.room.roomNumber} · {booking.room.roomType.name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Nights</dt>
                <dd className="text-right font-medium">{nights}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Booking status</dt>
                <dd className="text-right font-medium">{bookingApiStatusLabel(booking.status)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Stay (operational)</dt>
                <dd className="text-right font-medium capitalize">{stayLabel}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
            Charges
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 print:dark:border-slate-300">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-white/[0.04] print:dark:bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                    Description
                  </th>
                  <th className="hidden w-24 px-4 py-3 text-right font-semibold text-slate-700 sm:table-cell dark:text-white/80 print:dark:text-slate-800">
                    Qty
                  </th>
                  <th className="hidden w-28 px-4 py-3 text-right font-semibold text-slate-700 md:table-cell dark:text-white/80 print:dark:text-slate-800">
                    Rate
                  </th>
                  <th className="w-32 px-4 py-3 text-right font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100 dark:border-white/[0.06] print:dark:border-slate-200">
                  <td className="px-4 py-3 text-slate-800 dark:text-white/90 print:dark:text-slate-900">
                    Accommodation — Room {booking.room.roomNumber} ({booking.room.roomType.name})
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-white/45 print:dark:text-slate-600 sm:hidden">
                      {nights} nt × {formatUsd(booking.room.roomType.basePrice)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 dark:text-white/70 print:dark:text-slate-700 sm:table-cell">
                    {nights}
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 dark:text-white/70 print:dark:text-slate-700 md:table-cell">
                    {formatUsd(booking.room.roomType.basePrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-slate-900 dark:text-white print:dark:text-slate-900">
                    {formatUsd(booking.totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {Math.abs(lineFromRate - total) > 0.02 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-white/45 print:dark:text-slate-600">
              Reference subtotal from published rate ({nights} × {formatUsd(booking.room.roomType.basePrice)} ={" "}
              {formatUsd(lineFromRate.toFixed(2))}) may differ from the invoiced total if the rate was adjusted at
              booking.
            </p>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
            Payments received
          </h2>
          {bookingTxs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-white/50 print:dark:text-slate-600">No payments yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 print:dark:border-slate-300">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-white/[0.04] print:dark:bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                      Ref
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-white/80 print:dark:text-slate-800">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookingTxs.map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-100 dark:border-white/[0.06] print:dark:border-slate-200">
                      <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-white/70 print:dark:text-slate-700">
                        {formatShortDate(tx.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 dark:text-white/85 print:dark:text-slate-900">
                        {paymentMethodLabel(tx.paymentMethod)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-white/65 print:dark:text-slate-700">
                        {transactionRef(tx.id)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white print:dark:text-slate-900">
                        {tx.status === "REFUNDED" ? "−" : ""}
                        {formatUsd(tx.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-white/70 print:dark:text-slate-700">
                        {tx.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 dark:border-white/10 print:border-slate-300">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50 print:dark:text-slate-600">
                Payment summary
              </p>
              <p className="mt-2 text-sm capitalize text-slate-600 dark:text-white/65 print:dark:text-slate-700">
                Status: <span className="font-semibold text-slate-900 dark:text-white print:dark:text-slate-900">{payStatus}</span>
              </p>
            </div>
            <dl className="space-y-2 text-sm sm:text-right">
              <div className="flex justify-between gap-4 sm:ml-auto sm:max-w-xs">
                <dt className="text-slate-500 dark:text-white/55 print:dark:text-slate-600">Total due</dt>
                <dd className="font-semibold tabular-nums text-slate-900 dark:text-white print:dark:text-slate-900">
                  {formatUsd(booking.totalPrice)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 sm:ml-auto sm:max-w-xs">
                <dt className="text-slate-500 dark:text-white/55 print:dark:text-slate-600">Paid</dt>
                <dd className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300 print:text-emerald-800 print:dark:text-emerald-800">
                  {formatUsd(paid.toFixed(2))}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 dark:border-white/10 print:dark:border-slate-300 sm:ml-auto sm:max-w-xs">
                <dt className="font-semibold text-slate-800 dark:text-white print:dark:text-slate-900">Balance</dt>
                <dd className="font-bold tabular-nums text-slate-900 dark:text-white print:dark:text-slate-900">
                  {formatUsd(remaining.toFixed(2))}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400 dark:text-white/35 print:dark:text-slate-500">
            Thank you for choosing {hotel?.name ?? "us"}. For questions about this invoice, contact the front desk.
          </p>
        </footer>
      </article>
    </div>
  );
}
