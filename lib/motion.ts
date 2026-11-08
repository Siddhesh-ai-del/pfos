export const easeInstrument: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

export const dur = {
  fast: 0.14,
  base: 0.18,
  slow: 0.26,
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: dur.base, ease: easeInstrument },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: dur.fast, ease: easeInstrument },
};
