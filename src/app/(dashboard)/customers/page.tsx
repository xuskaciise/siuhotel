import { CustomersClient } from "@/components/customers/customers-client";
import { CustomersPageHeader } from "@/components/customers/customers-page-header";
import type { CustomerDto } from "@/lib/api/apiService";
import { ssrCustomersPageData } from "@/server/ssr/dashboard-data";
import { cn } from "@/lib/utils";

export default async function CustomersPage() {
  let customers: CustomerDto[];
  let loadError: string | null = null;
  try {
    const data = await ssrCustomersPageData();
    customers = data.customers;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load customers.";
    customers = [];
  }

  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <CustomersPageHeader
        title="Guest Registry"
        subtitle="Manage your distinguished guests with an ethereal touch. View profiles and visit histories."
      />
      <CustomersClient initialCustomers={customers} loadError={loadError} />
    </div>
  );
}
