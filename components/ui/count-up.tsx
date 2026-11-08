"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

export function useCountUp(target: number, duration = 420) {
  const reduce = useReducedMotion();
  const [v, setV] = React.useState(target);
  const prev = React.useRef(target);
  React.useEffect(() => {
    if (reduce || prev.current === target) { setV(target); prev.current = target; return; }
    const start = prev.current; const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(start + (target - start) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return v;
}
