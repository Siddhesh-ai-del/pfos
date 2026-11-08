import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <Suspense
        fallback={
          <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Loading ledger">
            <header className="border-b border-rule bg-paper/92 px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-7xl items-center gap-2">
                <span className="label-tech text-copper">PFOS</span>
                <span className="font-display text-[22px] leading-none tracking-tight">Ledger</span>
              </div>
            </header>
            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-4 md:px-6">
              <div className="mb-3 h-8 animate-pulse border-b border-rule bg-surface-2/30" />
              <div className="min-h-[60vh] animate-pulse rounded-[var(--radius-card)] border border-rule bg-card/60" />
            </main>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
