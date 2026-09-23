import test from 'node:test';
import assert from 'node:assert/strict';

import { zscore } from '../src/zscore.js';

test('zscore reuses fitted statistics and preserves constant columns', () => {
  const training = zscore([[0, 5], [2, 5]]);

  assert.deepEqual(training.stats, {
    mean: [1, 5],
    std: [1, 0],
    scale: [1, 0],
    count: [2, 2],
  });
  assert.deepEqual(training.data, [[-1, 0], [1, 0]]);
  assert.deepEqual(zscore([[3, 5]], training.stats).data, [[2, 0]]);
});

test('zscore rejects incomplete or mismatched supplied statistics', () => {
  const fitted = zscore([[0, 5], [2, 5]]).stats;
  const invalidStats = [
    {},
    { ...fitted, scale: undefined },
    { ...fitted, mean: [1] },
    { ...fitted, count: [2, 2, 2] },
    false,
  ];

  for (const stats of invalidStats) {
    assert.throws(() => zscore([[3, 5]], stats));
  }
});

test('zscore preserves supplied statistics for empty data', () => {
  const fitted = zscore([[0, 5], [2, 5]]).stats;

  assert.deepEqual(zscore([], fitted), { stats: fitted, data: [] });
  assert.deepEqual(zscore([]), {
    stats: { mean: [], std: [], scale: [], count: [] },
    data: [],
  });
  assert.throws(() => zscore([], {}));
});

test('zscore rejects invalid supplied statistic values', () => {
  const fitted = zscore([[0], [2]]).stats;
  const invalidStats = [
    { ...fitted, mean: [NaN] },
    { ...fitted, mean: ['1'] },
    { ...fitted, std: [Infinity] },
    { ...fitted, std: [-1] },
    { ...fitted, scale: [0] },
    { ...fitted, scale: [999] },
    { ...fitted, scale: [-1] },
    { ...fitted, count: [0.5] },
    { ...fitted, count: [1] },
    { ...fitted, count: [0x100000000] },
  ];

  for (const stats of invalidStats) {
    assert.throws(() => zscore([[3]], stats));
  }
});

test('zscore rejects fits whose statistics cannot be represented as finite numbers', () => {
  assert.throws(() => zscore([[-1e308], [1e308]]), RangeError);
});

test('zscore rejects a finite input when scaling would overflow', () => {
  const fitted = zscore([[0], [1]]).stats;
  assert.throws(() => zscore([[1e308]], fitted), RangeError);
});
