import { notFound } from "next/navigation";

import { BookingInvoiceClient } from "@/components/bookings/booking-invoice-client";
import { BookingsPageHeader } from "@/components/bookings/bookings-page-header";
import {
  fetchBookingFromBackend,
  fetchHotelInfoFromBackend,
  fetchTransactionsFromBackend,
  type BookingDto,
  type HotelInfoDto,
  type TransactionDto,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingInvoicePage(props: PageProps) {
  const { id } = await props.params;
  if (!id?.trim()) notFound();

  let booking: BookingDto | null = null;
  let loadError: string | null = null;
  let transactions: TransactionDto[] = [];
  let hotelInfo: HotelInfoDto | null = null;

  try {
    const [b, txs, hotel] = await Promise.all([
      fetchBookingFromBackend(id),
      fetchTransactionsFromBackend().catch(() => [] as TransactionDto[]),
      fetchHotelInfoFromBackend(),
    ]);
    booking = b;
    transactions = txs;
    hotelInfo = hotel;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load booking.";
  }

  const issuedAtIso = new Date().toISOString();

  if (!booking && loadError) {
    return (
      <div
        className={cn(
          "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:px-10 sm:py-10",
          "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        )}
      >
        <BookingsPageHeader title="Invoice" subtitle="Printable booking statement." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm font-medium text-destructive">
          {loadError}
        </div>
      </div>
    );
  }

  if (!booking) {
    notFound();
  }

  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl print:bg-white",
      )}
    >
      <div className="print:hidden">
        <BookingsPageHeader
          title="Booking invoice"
          subtitle="Official statement of charges, payments, and balance for this reservation."
        />
      </div>
      <BookingInvoiceClient booking={booking} transactions={transactions} hotel={hotelInfo} issuedAtIso={issuedAtIso} />
    </div>
  );
}
