# xy-scale.js

Machine learning data preparation helpers for JavaScript.

## Overview

`xy-scale.js` now focuses on turning already-prepared row objects into flat `X` and `Y` arrays for training or production use.

The library no longer scales values internally. Your `arrObj` input, or the objects returned by your callbacks, should already contain the numeric or boolean values you want to feed into a model.

## Installation

```bash
npm install xy-scale
```

## Exports

```javascript
import { parseTrainingXY, parseProductionX, arrayToTimesteps } from 'xy-scale';
```

## Main functions

### parseTrainingXY

Builds supervised-learning datasets and splits them into training and testing arrays.

#### Parameters

- `arrObj` (Array<Object>): Source dataset.
- `trainingSplit` (Number, optional): Fraction of rows used for training. Default: `0.8`.
- `yCallbackFunc` (Function, optional): Builds the output object for each row. Returning `null` or `undefined` skips the row.
- `xCallbackFunc` (Function, optional): Builds the feature object for each row. Returning `null` or `undefined` skips the row.
- `validateRows` (Function, optional): Extra row filter executed before the callbacks.
- `shuffle` (Boolean, optional): Shuffles `X` and `Y` together before splitting. Default: `false`.
- `balancing` (String, optional): Accepts `oversample` or `undersample`.
- `state` (Object, optional): Shared mutable state passed into callbacks.

#### Returns

- `trainX`, `trainY`
- `testX`, `testY`
- `configX`: `{ keyNames: [...] }`
- `configY`: `{ keyNames: [...] }`

`configX.keyNames` and `configY.keyNames` preserve the object-key order used when flattening each callback result into an array.

### parseProductionX

Builds production-ready feature arrays from already-prepared rows.

#### Parameters

- `arrObj` (Array<Object>): Source dataset.
- `xCallbackFunc` (Function, optional): Builds the feature object for each row. Returning `null`, `undefined`, or `false` skips the row.
- `validateRows` (Function, optional): Extra row filter executed before the callback.
- `shuffle` (Boolean, optional): Shuffles the final `X` rows. Default: `false`.
- `state` (Object, optional): Shared mutable state passed into the callback.

#### Returns

- `X`
- `configX`: `{ keyNames: [...] }`

### arrayToTimesteps

Converts a flat array into overlapping sequences for time-series models.

#### Parameters

- `arr` (Array): Input array.
- `timeSteps` (Number): Length of each sequence.
  - If `timeSteps === 0`, returns the original array.
  - If `timeSteps < 0`, throws an error.

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
  trainingSplit: 0.8,
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

- `parseTrainingXY` and `parseProductionX` do not scale values.
- If you need scaling, do it before passing data into this library.
- Callback return objects are flattened with `Object.values(...)`, using the same key order stored in `configX.keyNames` and `configY.keyNames`.

## License

This project is licensed under the MIT License.
