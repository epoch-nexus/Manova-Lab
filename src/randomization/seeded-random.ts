/**
 * Hashes a string seed into a 32-bit unsigned integer using 32-bit FNV-1a.
 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic 32-bit Pseudo-Random Number Generator from a string or numeric seed.
 * Implements the Mulberry32 algorithm.
 *
 * Guaranteed properties:
 * - Deterministic: same seed produces identical pseudo-random sequence.
 * - Uniform distribution over [0, 1).
 * - Zero reliance on Math.random().
 */
export function createSeededPrng(seed: string | number): () => number {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);

  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
