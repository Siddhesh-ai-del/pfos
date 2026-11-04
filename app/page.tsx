import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";

// Sync shell — no data access here, so the route produces an instant,
// prerenderable shell; the Postgres read streams in behind <Suspense>.

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <Suspense
        fallback={
          <main
            aria-busy="true"
            aria-label="Loading your financial context"
            className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-8 pt-6 md:px-8"
          >
            <div className="flex items-center justify-between border-b border-rule pb-4">
              <div className="h-6 w-16 animate-pulse rounded bg-rule/60" />
              <div className="h-4 w-24 animate-pulse rounded bg-rule/60" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="h-72 animate-pulse rounded-card bg-rule/40 md:col-span-3" />
              <div className="h-72 animate-pulse rounded-card bg-rule/40 md:col-span-2" />
            </div>
          </main>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
