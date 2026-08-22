import { createHash, createHmac } from 'node:crypto';

/**
 * An independent implementation of the draw, written from the Product
 * Constitution rather than from the SQL.
 *
 * Its whole purpose is to disagree with `public.run_daily_draw` if either one
 * is wrong. It shares no code with the migration on purpose — a verifier that
 * imports the implementation verifies nothing.
 *
 * This lives under tests/ so it never enters the app bundle; `node:crypto` does
 * not exist in React Native.
 */

/** rank(candidate) = HMAC-SHA256(candidate_id, seed), hex. */
export function drawRank(seed: string, candidate: string): string {
  return createHmac('sha256', seed).update(candidate).digest('hex');
}

/** The full ordering a seed produces over a pool. Ties break on id. */
export function drawOrder(seed: string, ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const rankA = drawRank(seed, a);
    const rankB = drawRank(seed, b);
    if (rankA === rankB) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    return rankA < rankB ? -1 : 1;
  });
}

/** The pool hash: SHA-256 of the id list, sorted, comma-joined. */
export function poolHash(ids: string[]): string {
  const sorted = [...ids].sort();
  return createHash('sha256').update(sorted.join(',')).digest('hex');
}

export interface DrawResult {
  selected: string | undefined;
  backups: (string | undefined)[];
  poolHash: string;
  candidateCount: number;
}

export function runDraw(seed: string, pool: string[]): DrawResult {
  const ordered = drawOrder(seed, pool);
  return {
    selected: ordered[0],
    backups: [ordered[1], ordered[2], ordered[3]],
    poolHash: poolHash(pool),
    candidateCount: pool.length,
  };
}
