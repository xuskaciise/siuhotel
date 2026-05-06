"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  createUserClient,
  fetchSetupStatusClient,
  type SetupRoleOptionDto,
  type SetupStatusDto,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full rounded-xl px-3 py-2.5 text-sm text-foreground outline-none ring-0 transition",
  "bg-[rgb(255_255_255/0.65)] shadow-[inset_0_1px_3px_rgb(15_23_42/0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[#00CCFF]/45",
  "dark:bg-[rgb(255_255_255/0.06)] dark:text-white dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
);

const labelClass =
  "mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground dark:text-[#8a97a8]";

function defaultRoleId(roles: SetupRoleOptionDto[]): string {
  const staff = roles.find((r) => r.name === "STAFF");
  return (staff ?? roles[0])?.id ?? "";
}

export function SetupClient() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatusDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const s = await fetchSetupStatusClient();
      setStatus(s);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load setup status.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status?.needsBootstrap && status.roles.length > 0) {
      setRoleId((prev) => (prev ? prev : defaultRoleId(status.roles)));
    }
  }, [status]);

  const onBootstrap = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!username.trim() || !fullName.trim() || password.length < 8) {
        setFormError("Username, full name, and password (8+ characters) are required.");
        return;
      }
      if (!roleId) {
        setFormError("Choose a role.");
        return;
      }
      setSubmitting(true);
      try {
        await createUserClient({
          username: username.trim(),
          fullName: fullName.trim(),
          password,
          roleId,
          email: email.trim() || undefined,
        });
        router.replace(`/login?username=${encodeURIComponent(username.trim().toLowerCase())}`);
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not create user.");
      } finally {
        setSubmitting(false);
      }
    },
    [username, fullName, email, password, roleId, router],
  );

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-center text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
          Retry
        </Button>
        <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (status === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading setup…</p>
      </div>
    );
  }

  if (!status.needsBootstrap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="relative h-14 w-14">
          <Image src="/siulogo.png" alt="SIU" fill className="object-contain" sizes="56px" />
        </div>
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-foreground dark:text-white">Setup already done</h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-[#a8b4c4]">
            Database-ka waxaa ku jira {status.userCount} isticmaale. Gal dashboard-ka adigoo isticmaalaya username iyo
            password.
          </p>
        </div>
        <Link
          href="/login"
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-full px-8 text-[0.8125rem] font-semibold text-[#0d1322]",
            "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] shadow-[0_10px_32px_rgb(0_204_255/0.3)] hover:from-[#33d6ff] hover:to-[#00b4ea]",
          )}
        >
          Go to sign in
        </Link>
      </div>
    );
  }

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
          "relative z-10 w-full max-w-lg rounded-3xl p-8 shadow-2xl ring-1",
          "bg-white/90 ring-black/5 backdrop-blur-xl dark:bg-[rgb(18_24_38/0.92)] dark:ring-white/10",
        )}
      >
        <div className="mb-6 text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <Image src="/siulogo.png" alt="SIU" fill className="object-contain" sizes="48px" priority />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground dark:text-white">
            First staff account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-[#a8b4c4]">
            Miiska users waa madhan. Abuur isticmaalaha ugu horreeya si aad u gasho system-ka (kadib waxaad ku dari
            kartaa dadka kale bogga Staff).
          </p>
        </div>

        {status.roles.length === 0 ? (
          <p className="text-center text-sm text-destructive">
            No roles found in the database. Run migrations and seed (`npm run db:migrate` / `npm run db:seed`) then
            refresh.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={(ev) => void onBootstrap(ev)}>
            {formError ? (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div>
              <label className={labelClass} htmlFor="su-username">
                Username
              </label>
              <input
                id="su-username"
                className={fieldClass}
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="su-fullname">
                Full name
              </label>
              <input
                id="su-fullname"
                className={fieldClass}
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="su-email">
                Email (optional)
              </label>
              <input
                id="su-email"
                type="email"
                className={fieldClass}
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="su-password">
                Password (min 8 characters)
              </label>
              <input
                id="su-password"
                type="password"
                className={fieldClass}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="su-role">
                Role
              </label>
              <select
                id="su-role"
                className={cn(fieldClass, "cursor-pointer")}
                value={roleId}
                onChange={(ev) => setRoleId(ev.target.value)}
                required
              >
                {status.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.description ? ` — ${r.description}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[0.8125rem] font-semibold text-[#0d1322] shadow-[0_10px_32px_rgb(0_204_255/0.3)]"
            >
              {submitting ? "Creating…" : "Create account & go to sign in"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Already have an account?
          </Link>
        </p>
      </div>
    </div>
  );
}
