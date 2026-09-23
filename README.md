# xy-scale.js

Machine learning data preparation helpers for JavaScript.

## Overview

`xy-scale.js` turns row objects into flat `X` and `Y` arrays for training or production use. Feature values must be finite numbers. Scaling is optional: `scaling: 'zscore'` fits statistics on training features and applies those same statistics to test or production features.

## Installation

```bash
npm install xy-scale
```

## Exports

```javascript
import { parseTrainingXY, parseProductionX, arrayToTimesteps, arrayShuffle, zscore } from 'xy-scale';
```

## Main functions

### parseTrainingXY

Builds supervised-learning datasets and splits them into training and testing arrays.

#### Parameters

- `arrObj` (Array<Object>): Source dataset.
- `trainSize` (positive integer, required): Number of eligible rows to return for training.
- `testSize` (non-negative integer, required): Number of eligible rows to return for testing.
- `yCallbackFunc` (Function, optional): Builds the label object for each row. Returning `null` or `undefined` skips the row.
- `xCallbackFunc` (Function, optional): Builds the feature object for each row. Returning `null` or `undefined` skips the row.
- `validateRows` (Function, optional): Extra row filter executed before the callbacks.
- `shuffle` (Boolean, optional): Shuffles `X` and `Y` together before splitting. Default: `false`.
- `state` (Object, optional): Shared mutable state passed into callbacks.
- `showSource` (Boolean, optional): Includes the source rows in `trainSource` and `testSource`.
- `scaling` (`null` or `'zscore'`, optional): Fits scaling statistics on training rows only.

Each callback receives `{ objRow, index, state }`. By default, both callbacks return `objRow[index]`. After filtering, the function keeps the last `trainSize + testSize` eligible rows (or a random subset when shuffled). It throws if too few eligible rows remain.

#### Returns

- `trainX`, `trainY`
- `testX`, `testY`
- `configX`: `{ keyNames: [...] }`
- `configY`: `{ keyNames: [...], labelCounts: {...} }` for the returned rows
- `stats`: Fitted statistics and feature key order when `scaling: 'zscore'`, otherwise `null`
- `trainSource`, `testSource`: Source rows when `showSource: true`

`configX.keyNames` and `configY.keyNames` preserve the object-key order used when flattening each callback result into an array.

### parseProductionX

Builds production-ready feature arrays from already-prepared rows.

#### Parameters

- `arrObj` (Array<Object>): Source dataset.
- `xCallbackFunc` (Function, optional): Builds the feature object for each row. Returning `null`, `undefined`, or `false` skips the row. Defaults to the current source row.
- `validateRows` (Function, optional): Extra row filter executed before the callback.
- `shuffle` (Boolean, optional): Shuffles the final `X` rows. Default: `false`.
- `state` (Object, optional): Shared mutable state passed into the callback.
- `showSource` (Boolean, optional): Includes source rows in the result.
- `scaling` (`null` or `'zscore'`, optional): Applies z-score scaling to production features.
- `stats` (Object, required when scaling): Statistics returned by `parseTrainingXY` during training, including feature key order.

#### Returns

- `X`
- `configX`: `{ keyNames: [...] }`
- `source`: Source rows when `showSource: true`; otherwise `[]`

### arrayToTimesteps

Converts a flat array into overlapping sequences for time-series models.

#### Parameters

- `arr` (Array): Input array.
- `timeSteps` (positive integer): Length of each sequence.
- `step` (positive integer, optional): Number of positions between windows. Default: `1`.

#### Returns

- An array of overlapping sub-arrays, each containing `timeSteps` elements.

## Usage example

```javascript
import { parseTrainingXY, arrayToTimesteps } from 'xy-scale';
import * as tf from '@tensorflow/tfjs-node';

const candles = [
  { closeScaled: 0.41, volumeScaled: 0.22, targetUp: 1 },
  { closeScaled: 0.45, volumeScaled: 0.25, targetUp: 0 },
  { closeScaled: 0.48, volumeScaled: 0.28, targetUp: 1 },
  { closeScaled: 0.51, volumeScaled: 0.31, targetUp: 1 },
  { closeScaled: 0.49, volumeScaled: 0.27, targetUp: 0 },
  { closeScaled: 0.54, volumeScaled: 0.35, targetUp: 1 },
];

const { trainX, trainY, testX, testY, configX, configY } = parseTrainingXY({
  arrObj: candles,
  trainSize: 4,
  testSize: 2,
  shuffle: true,
  xCallbackFunc: ({ objRow, index }) => ({
    close: objRow[index].closeScaled,
    volume: objRow[index].volumeScaled,
  }),
  yCallbackFunc: ({ objRow, index }) => ({
    target: objRow[index].targetUp,
  }),
});

const timeSteps = 3;
const timeSteppedTrainX = arrayToTimesteps(trainX, timeSteps);
const trimmedTrainY = trainY.slice(timeSteps - 1);

const inputX = tf.tensor3d(timeSteppedTrainX, [timeSteppedTrainX.length, timeSteps, trainX[0].length]);
const targetY = tf.tensor2d(trimmedTrainY, [trimmedTrainY.length, trainY[0].length]);

console.log(configX.keyNames);
console.log(configY.keyNames);
console.log(testX, testY);
console.log(inputX, targetY);
```

## Notes

- Callback return objects are flattened using the key order stored in `configX.keyNames` and `configY.keyNames`. Every included row must return the same keys.
- When using z-score scaling in production, pass the training result's `stats` to `parseProductionX`. Production features must have the same names and order as training features.

## License

This project is licensed under the MIT License.
