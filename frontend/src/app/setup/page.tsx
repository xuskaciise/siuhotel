import { Suspense } from "react";

import { SetupClient } from "./setup-client";

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SetupClient />
    </Suspense>
  );
}
