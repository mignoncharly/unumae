import { createHash } from 'node:crypto';

import { drawOrder, drawRank, poolHash, runDraw } from './helpers/draw';

/**
 * Article 5 — an equal chance among eligible users. Equal means equal.
 *
 * scripts/verify-draw.mjs proves the database agrees with this implementation.
 * These tests prove this implementation is fair in the first place.
 */

function uuidFrom(n: number): string {
  const hex = createHash('sha256').update(String(n)).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

const pool = (size: number) =>
  Array.from({ length: size }, (_, index) => uuidFrom(index));

describe('the draw is reproducible', () => {
  it('gives the same result for the same seed and pool', () => {
    const candidates = pool(20);
    expect(drawOrder('seed', candidates)).toEqual(
      drawOrder('seed', candidates)
    );
  });

  it('does not depend on the order the pool arrives in', () => {
    // Whoever the database happens to return first must not matter.
    const candidates = pool(20);
    const shuffled = [...candidates].reverse();
    expect(drawOrder('seed', shuffled)).toEqual(drawOrder('seed', candidates));
  });

  it('is a permutation: everyone in, nobody twice, nobody invented', () => {
    const candidates = pool(50);
    const ordered = drawOrder('seed', candidates);

    expect(ordered).toHaveLength(candidates.length);
    expect(new Set(ordered).size).toBe(candidates.length);
    expect([...ordered].sort()).toEqual([...candidates].sort());
  });

  it('changes completely when the seed changes', () => {
    const candidates = pool(20);
    expect(drawOrder('seed-a', candidates)).not.toEqual(
      drawOrder('seed-b', candidates)
    );
  });

  it('ranks a candidate on the seed and their id, and nothing else', () => {
    // There is no third argument, which is how Article 5.3's forbidden inputs
    // stay forbidden: there is nowhere to put them.
    expect(drawRank).toHaveLength(2);
    expect(drawRank('seed', uuidFrom(1))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the draw is fair', () => {
  /**
   * The test that would catch a rigged draw. Ten candidates, ten thousand
   * seeds: each should win about a thousand times. A weighting of even a few
   * percent shows up here well outside the tolerance.
   */
  it('gives every candidate the same chance of winning', () => {
    const candidates = pool(10);
    const trials = 10_000;
    const wins = new Map(candidates.map((id) => [id, 0]));

    for (let index = 0; index < trials; index += 1) {
      const winner = drawOrder(`seed-${index}`, candidates)[0]!;
      wins.set(winner, wins.get(winner)! + 1);
    }

    const expected = trials / candidates.length;
    // ±15% is roughly five standard deviations, so this fails on bias rather
    // than on luck.
    const tolerance = expected * 0.15;

    for (const [id, count] of wins) {
      expect({ id, within: Math.abs(count - expected) <= tolerance }).toEqual({
        id,
        within: true,
      });
    }
  });

  it('spreads the backup positions too', () => {
    // Being backup 1 must not be a consolation prize that always goes to the
    // same person: escalation makes it a real chance of being published.
    const candidates = pool(8);
    const firstBackups = new Set<string>();

    for (let index = 0; index < 200; index += 1) {
      firstBackups.add(drawOrder(`seed-${index}`, candidates)[1]!);
    }

    expect(firstBackups.size).toBe(candidates.length);
  });

  it('does not favour candidates whose id sorts first', () => {
    // A naive implementation that fell back to id order would fail this.
    const candidates = pool(10);
    const sortedFirst = [...candidates].sort()[0];
    let wins = 0;

    for (let index = 0; index < 1000; index += 1) {
      if (drawOrder(`seed-${index}`, candidates)[0] === sortedFirst) {
        wins += 1;
      }
    }

    expect(wins).toBeGreaterThan(50);
    expect(wins).toBeLessThan(150);
  });
});

describe('the pool hash', () => {
  it('depends on membership, not on order', () => {
    const candidates = pool(10);
    expect(poolHash([...candidates].reverse())).toBe(poolHash(candidates));
  });

  it('changes when one candidate is added', () => {
    const candidates = pool(10);
    expect(poolHash([...candidates, uuidFrom(999)])).not.toBe(
      poolHash(candidates)
    );
  });

  it('changes when one candidate is removed', () => {
    const candidates = pool(10);
    expect(poolHash(candidates.slice(1))).not.toBe(poolHash(candidates));
  });

  it('hashes the empty pool rather than returning nothing', () => {
    // The Quiet Day case (Article 5.8) — and the case the database got wrong.
    expect(poolHash([])).toBe(createHash('sha256').update('').digest('hex'));
  });
});

describe('a complete draw', () => {
  it('selects one human and three backups, all different', () => {
    const result = runDraw('seed', pool(20));
    const chosen = [result.selected, ...result.backups];

    expect(result.candidateCount).toBe(20);
    expect(new Set(chosen).size).toBe(4);
  });

  it('selects exactly one human, never two (Article 1.6)', () => {
    const result = runDraw('seed', pool(20));
    expect(typeof result.selected).toBe('string');
  });

  it('copes with a pool smaller than the number of backups', () => {
    const result = runDraw('seed', pool(2));
    expect(result.selected).toBeDefined();
    expect(result.backups[0]).toBeDefined();
    expect(result.backups[1]).toBeUndefined();
    expect(result.backups[2]).toBeUndefined();
  });

  it('selects nobody from an empty pool, and says so honestly', () => {
    const result = runDraw('seed', []);
    expect(result.selected).toBeUndefined();
    expect(result.candidateCount).toBe(0);
  });

  it('selects the only candidate when there is exactly one', () => {
    const only = uuidFrom(1);
    expect(runDraw('seed', [only]).selected).toBe(only);
  });
});
