"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useStaffAuth } from "@/components/auth/staff-auth-provider";
import { loginStaffClient } from "@/lib/api/apiService";
import { getStaffToken } from "@/lib/auth/staff-session";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoggedIn } = useStaffAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStaffToken()) {
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/");
    }
  }, [router, searchParams]);

  useEffect(() => {
    const u = searchParams.get("username");
    if (u) setUsername(u);
  }, [searchParams]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        const { token, user } = await loginStaffClient(username.trim(), password);
        setLoggedIn(token, user);
        const next = searchParams.get("next");
        router.replace(next && next.startsWith("/") ? next : "/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [username, password, router, searchParams, setLoggedIn],
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,204,255,0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,153,255,0.2), transparent)",
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl ring-1",
          "bg-white/90 ring-black/5 backdrop-blur-xl dark:bg-[rgb(18_24_38/0.92)] dark:ring-white/10",
        )}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 h-14 w-14">
            <Image src="/siulogo.png" alt="SIU" fill className="object-contain" sizes="56px" priority />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white">
            Staff sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-[#a8b4c4]">
            Gal magaca isticmaalaha (username) iyo erayga sirta ah si aad u hesho dashboard-ka.
          </p>
        </div>

        <form className="space-y-4" onSubmit={(ev) => void onSubmit(ev)}>
          {error ? (
            <p
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive dark:bg-destructive/20 dark:text-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div>
            <label className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              className={fieldClass}
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              required
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]"
              htmlFor="login-password"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={fieldClass}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[0.8125rem] font-semibold text-[#0d1322] shadow-[0_10px_32px_rgb(0_204_255/0.3)] hover:from-[#33d6ff] hover:to-[#00b4ea]"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground dark:text-[#7a8799]">
          Ma jiro isticmaale database-ka?{" "}
          <Link href="/setup" className="font-medium text-primary underline-offset-4 hover:underline dark:text-[#9de2ff]">
            Samee account-ka ugu horreeya
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground dark:text-[#7a8799]">
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline dark:text-[#9de2ff]">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
