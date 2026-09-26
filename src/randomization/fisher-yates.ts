import { createSeededPrng } from './seeded-random.js';

/**
 * Performs a deterministic seeded Fisher-Yates (Knuth) shuffle on an array.
 *
 * Guarantees:
 * 1. Non-mutating: Original input array is never altered.
 * 2. Deterministic: Given the exact same items and seed, produces the exact same permutation.
 * 3. Complete: Returns all original elements exactly once with zero duplications or omissions.
 * 4. Distinct: Different seeds yield distinct permutations where mathematically possible.
 *
 * @param items Array of elements (e.g. trial IDs) to shuffle.
 * @param seed Cryptographic or deterministic string/number seed.
 * @returns A newly allocated array containing the shuffled elements.
 */
export function seededFisherYatesShuffle<T>(
  items: readonly T[],
  seed: string | number
): T[] {
  if (items.length <= 1) {
    return [...items];
  }

  const result = [...items];
  const prng = createSeededPrng(seed);

  for (let i = result.length - 1; i > 0; i--) {
    // Generate an index j in the closed range [0, i]
    const j = Math.floor(prng() * (i + 1));

    // Swap elements at i and j
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  return result;
}
