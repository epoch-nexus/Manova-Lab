import crypto from 'crypto';

/**
 * Generates a cryptographically strong pseudo-random seed for session-level trial randomization.
 *
 * Guarantees:
 * - Uses Node.js crypto.randomBytes (OS-level CSPRNG source).
 * - Zero reliance on Math.random().
 * - Not based on timestamps alone.
 *
 * @returns 32-character hexadecimal string representing 128 bits of entropy.
 */
export function generateRandomizationSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}
