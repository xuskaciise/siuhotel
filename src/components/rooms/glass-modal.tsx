"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type GlassModalSize = "default" | "wide";

type GlassModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `wide` — larger dialog (e.g. photo gallery). */
  size?: GlassModalSize;
};

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "default",
}: GlassModalProps) {
  const isWide = size === "wide";
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 cursor-default ring-0",
          "bg-[rgb(13_19_34/0.55)] backdrop-blur-[20px]",
          "dark:bg-[rgb(5_8_18/0.72)]",
        )}
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="glass-modal-title"
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl ring-0",
          isWide ? "max-w-[min(96vw,72rem)]" : "max-w-lg",
          "bg-[rgb(255_255_255/0.78)] shadow-[0_24px_80px_rgb(15_23_42/0.18)]",
          "backdrop-blur-xl dark:bg-[rgb(24_31_48/0.82)] dark:shadow-[0_28px_90px_rgb(0_0_0/0.45)]",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "bg-gradient-to-b from-[rgb(0_204_255/0.06)] to-transparent dark:from-[rgb(0_204_255/0.08)]",
            isWide ? "px-8 pb-5 pt-7 sm:px-10 sm:pt-8" : "px-6 pb-4 pt-6",
          )}
        >
          <h2
            id="glass-modal-title"
            className={cn(
              "font-display font-semibold tracking-tight text-foreground dark:text-white",
              isWide ? "text-xl sm:text-2xl" : "text-lg",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                "leading-relaxed text-muted-foreground dark:text-[#a8b4c4]",
                isWide ? "mt-2 text-[0.9375rem] sm:text-base" : "mt-1.5 text-sm",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "overflow-y-auto",
            isWide
              ? "max-h-[min(82vh,52rem)] px-6 py-6 sm:px-10 sm:py-8"
              : "max-h-[min(70vh,520px)] px-6 py-5",
          )}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-end gap-2 bg-muted/30 dark:bg-[rgb(0_0_0/0.2)]",
              isWide ? "px-8 py-5 sm:px-10" : "px-6 py-4",
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
