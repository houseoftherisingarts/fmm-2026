// ─── Un hasard qui se rejoue ────────────────────────────────────────
// Alex, 2026-09-01 : le banc d'essai fait mille parties et doit pouvoir
// refaire EXACTEMENT les mêmes quand une règle change. `Math.random`
// l'interdit. Ce générateur (mulberry32) tient dans huit lignes, part
// d'une graine et rend toujours la même suite.

export type Alea = () => number;

export function graine(n: number): Alea {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Le hasard ordinaire du navigateur, quand la reproductibilité ne sert à rien. */
export const auHasard: Alea = () => Math.random();

export const entier = (a: Alea, n: number): number => Math.floor(a() * n);

export function piocher<T>(a: Alea, t: readonly T[]): T {
  return t[entier(a, t.length)];
}

/** Mélange de Fisher-Yates, sur une copie. */
export function melanger<T>(a: Alea, t: readonly T[]): T[] {
  const s = [...t];
  for (let i = s.length - 1; i > 0; i--) {
    const j = entier(a, i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}
