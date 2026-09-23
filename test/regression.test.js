import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProductionX, parseTrainingXY } from '../index.js';

const xValue = ({ objRow, index }) => ({ value: objRow[index].value });
const yLabel = ({ objRow, index }) => ({ label: objRow[index].label });

test('filtered rows keep requested train and test splits disjoint', () => {
  const arrObj = [0, 1, 2, 3, 4].map(value => ({ value, label: value }));
  const result = parseTrainingXY({
    arrObj,
    trainSize: 2,
    testSize: 2,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
    validateRows: ({ index }) => index !== 4,
  });

  assert.deepEqual(result.trainX, [[0], [1]]);
  assert.deepEqual(result.testX, [[2], [3]]);
  assert.deepEqual(result.trainY, [[0], [1]]);
  assert.deepEqual(result.testY, [[2], [3]]);
});

test('training rejects a split larger than the eligible row count', () => {
  const arrObj = [0, 1, 2, 3].map(value => ({ value, label: value }));
  assert.throws(() => parseTrainingXY({
    arrObj,
    trainSize: 2,
    testSize: 2,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
    validateRows: ({ index }) => index !== 3,
  }));
});

test('testSize zero returns no test data or source rows', () => {
  const arrObj = [0, 1, 2].map(value => ({ value, label: value }));
  const result = parseTrainingXY({
    arrObj,
    trainSize: 2,
    testSize: 0,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
    showSource: true,
  });

  assert.deepEqual(result.trainX, [[1], [2]]);
  assert.deepEqual(result.testX, []);
  assert.deepEqual(result.testY, []);
  assert.deepEqual(result.testSource, []);
});

test('default callbacks flatten the current source row', () => {
  const arrObj = [{ value: 10 }, { value: 20 }];
  const training = parseTrainingXY({ arrObj, trainSize: 1, testSize: 1 });
  const production = parseProductionX({ arrObj });

  assert.deepEqual(training.trainX, [[10]]);
  assert.deepEqual(training.trainY, [[10]]);
  assert.deepEqual(training.testX, [[20]]);
  assert.deepEqual(training.testY, [[20]]);
  assert.deepEqual(production.X, [[10], [20]]);
});

test('a single source row can fill a train-only split', () => {
  const result = parseTrainingXY({
    arrObj: [{ value: 10 }],
    trainSize: 1,
    testSize: 0,
  });
  assert.deepEqual(result.trainX, [[10]]);
  assert.deepEqual(result.trainY, [[10]]);
  assert.deepEqual(result.testX, []);
});

test('production callback false skips a row', () => {
  const arrObj = [{ value: 1 }, { value: 2 }];
  const result = parseProductionX({
    arrObj,
    xCallbackFunc: ({ objRow, index }) =>
      index === 0 ? false : { value: objRow[index].value },
  });
  assert.deepEqual(result.X, [[2]]);
});

test('production zscore requires training statistics and applies them', () => {
  const training = parseTrainingXY({
    arrObj: [{ value: 0, label: 0 }, { value: 2, label: 1 }],
    trainSize: 2,
    testSize: 0,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
    scaling: 'zscore',
  });

  assert.throws(() => parseProductionX({
    arrObj: [{ value: 2 }],
    xCallbackFunc: xValue,
    scaling: 'zscore',
  }));

  const production = parseProductionX({
    arrObj: [{ value: 2 }],
    xCallbackFunc: xValue,
    scaling: 'zscore',
    stats: training.stats,
  });
  assert.deepEqual(production.X, [[1]]);
});

test('production zscore requires the training feature order', () => {
  const training = parseTrainingXY({
    arrObj: [
      { a: 0, b: 10, label: 0 },
      { a: 2, b: 30, label: 1 },
    ],
    trainSize: 2,
    testSize: 0,
    xCallbackFunc: ({ objRow, index }) => ({
      a: objRow[index].a,
      b: objRow[index].b,
    }),
    yCallbackFunc: yLabel,
    scaling: 'zscore',
  });

  assert.deepEqual(training.stats.keyNames, ['a', 'b']);
  assert.deepEqual(parseProductionX({
    arrObj: [{ a: 2, b: 30 }],
    scaling: 'zscore',
    stats: training.stats,
  }).X, [[1, 1]]);
  assert.throws(() => parseProductionX({
    arrObj: [{ b: 30, a: 2 }],
    scaling: 'zscore',
    stats: training.stats,
  }));
});

test('training and production reject inconsistent feature keys', () => {
  const arrObj = [{ a: 1, b: 2 }, { a: 3, c: 4 }];
  const xCallbackFunc = ({ objRow, index }) => objRow[index];

  assert.throws(() => parseTrainingXY({
    arrObj,
    trainSize: 1,
    testSize: 1,
    xCallbackFunc,
    yCallbackFunc: ({ index }) => ({ label: index }),
  }));
  assert.throws(() => parseProductionX({ arrObj, xCallbackFunc }));
});

test('training rejects nonfinite and missing labels', () => {
  for (const invalidLabel of [NaN, Infinity, null, undefined, [0, NaN]]) {
    assert.throws(() => parseTrainingXY({
      arrObj: [{ value: 1, label: 0 }, { value: 2, label: invalidLabel }],
      trainSize: 1,
      testSize: 1,
      xCallbackFunc: xValue,
      yCallbackFunc: yLabel,
    }));
  }
});

test('training preserves string, boolean, and array labels', () => {
  const result = parseTrainingXY({
    arrObj: [
      { value: 1, label: 'up' },
      { value: 2, label: true },
      { value: 3, label: [1, 0] },
    ],
    trainSize: 2,
    testSize: 1,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
  });

  assert.deepEqual(result.trainY, [['up'], [true]]);
  assert.deepEqual(result.testY, [[[1, 0]]]);
  assert.deepEqual(result.configY.labelCounts, {
    label: { up: 1, true: 1, '[1,0]': 1 },
  });
});

test('row filter can skip an invalid first source row', () => {
  const arrObj = [
    { value: NaN, label: 0 },
    { value: 1, label: 1 },
    { value: 2, label: 0 },
  ];
  const result = parseTrainingXY({
    arrObj,
    trainSize: 1,
    testSize: 1,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
    validateRows: ({ index }) => index !== 0,
  });

  assert.deepEqual(result.trainX, [[1]]);
  assert.deepEqual(result.testX, [[2]]);
  assert.deepEqual(parseProductionX({
    arrObj,
    xCallbackFunc: xValue,
    validateRows: ({ index }) => index !== 0,
  }).X, [[1], [2]]);
});

test('labelCounts describes only the returned train and test rows', () => {
  const result = parseTrainingXY({
    arrObj: [
      { value: 0, label: 1 },
      { value: 1, label: 0 },
      { value: 2, label: 1 },
    ],
    trainSize: 1,
    testSize: 1,
    xCallbackFunc: xValue,
    yCallbackFunc: yLabel,
  });

  assert.deepEqual(result.trainY, [[0]]);
  assert.deepEqual(result.testY, [[1]]);
  assert.deepEqual(result.configY.labelCounts, { label: { 0: 1, 1: 1 } });
});
