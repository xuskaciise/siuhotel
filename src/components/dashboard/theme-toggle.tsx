"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full ring-0",
          "bg-[#f4f4f7] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[rgb(255_255_255/0.08)] dark:shadow-none",
        )}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full ring-0 transition",
        "bg-[#f4f4f7] text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:bg-[#eaeaea]",
        "dark:bg-[rgb(255_255_255/0.08)] dark:text-[#e8f0ff] dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-[1.1rem]" strokeWidth={1.75} /> : <Moon className="size-[1.1rem]" strokeWidth={1.75} />}
    </button>
  );
}
