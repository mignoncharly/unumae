import { mapWithConcurrency } from './boundedConcurrency.ts';

Deno.test(
  'bounded concurrency preserves order and caps active work',
  async () => {
    let active = 0;
    let maximum = 0;
    const result = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (value) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return value * 2;
      }
    );
    if (maximum > 2) throw new Error('concurrency limit was exceeded');
    if (result.join(',') !== '2,4,6,8,10') throw new Error('order changed');
  }
);
