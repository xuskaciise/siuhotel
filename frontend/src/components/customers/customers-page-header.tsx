import Image from "next/image";

type CustomersPageHeaderProps = {
  title: string;
  subtitle: string;
};

export function CustomersPageHeader({ title, subtitle }: CustomersPageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <Image
            src="/siulogo.png"
            alt="SIU"
            fill
            className="object-contain object-left dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
            sizes="56px"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-primary dark:text-[#7ed9ff]">
            Customers
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground dark:text-[#b4c0cc]">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

