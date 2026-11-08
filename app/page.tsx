import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <Suspense
        fallback={
          <div className="flex h-dvh min-h-dvh flex-col" aria-busy="true" aria-label="Loading ledger">
            <header className="border-b border-rule bg-paper/92 px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-7xl items-center gap-2">
                <span className="label-tech text-copper">PFOS</span>
                <span className="font-display text-[22px] leading-none tracking-tight">Ledger</span>
              </div>
            </header>
            <main className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-4 py-4 md:px-6">
              <Skeleton className="mb-3 h-8 shrink-0 w-full" />
              <Skeleton className="min-h-0 flex-1 w-full rounded-[var(--radius-card)]" />
            </main>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
