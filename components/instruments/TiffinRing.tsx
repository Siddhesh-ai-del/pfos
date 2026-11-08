"use client";

export function TiffinRing({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const r = 18; const c = 2 * Math.PI * r; const off = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--rule)" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--confirmed)" strokeWidth="3" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div>
        <p className="num font-mono text-[13px] text-ink">{label}</p>
        <p className="label-tech">{Math.round(pct)}% cycle readout</p>
      </div>
    </div>
  );
}
