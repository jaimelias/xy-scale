#  xy-scale.js | Machine Learning Data Preparation Toolkit: XY Splitting, Feature Weighting, Standardization, and Normalization in JavaScript


## Overview

This repository provides utilities for scaling and preparing datasets in JavaScript, with a primary focus on data preprocessing for machine learning applications. The main functionality includes scaling numerical and categorical data and splitting datasets into training and testing sets.

The primary functions, `parseTrainingXY` and `parseProductionX`, offer a flexible and modular approach to data handling, allowing users to define custom scaling approaches, weighting of X, and specific parsing rules for X and Y.

---

## Installation

`$ npm i xy-scale`

---

## Main Functions

### 1. `parseTrainingXY`

This function prepares a dataset for supervised learning by parsing, scaling, and splitting it into training and testing subsets. It includes configurable options for feature weighting and scaling approaches.

#### Parameters:
- `arrObj` (Array of Objects): Input data array containing all X and Y.
- `trainingSplit` (Number, optional): Defines the training dataset size (default `0.8`).
- `weights` (Object, optional): Feature weights for scaling.
- `yCallbackFunc` (Function): Custom function to parse Y for each object. Return null or undefined to exclude it from training.
- `xCallbackFunc` (Function): Custom function to parse X for each object. Return null or undefined to exclude it from training.
- `forceScaling` (String, optional): Forces a specific scaling approach for each feature.

#### Features:
- **Y and X Parsing**: Custom parsing for Y and X based on user-defined functions.
- **Configurable Scaling and Splitting**: Scales X and Y independently and splits data into training and testing sets.

#### Scaling Approaches:
- **Normalization**: Scales values to a range of `[0, 1]`.
- **Standardization**: Scales values to have a mean of `0` and standard deviation of `1`.
- **Automatic Selection (Default)**: If `forceScaling = null`, the function automatically selects between `'normalization'` and `'standardization'` for each feature. 
    - **Normalization** is chosen for X with lower variance (small difference between mean and standard deviation), scaling values to a `[0, 1]` range.
    - **Standardization** is applied when higher variance is detected (large difference between mean and standard deviation), centering values with a mean of `0` and a standard deviation of `1`.

    This adaptive scaling approach ensures the most effective transformation is applied based on each feature's statistical properties.

#### Returns:
- `trainX`, `trainY`, `testX`, `testY`: Scaled feature and label arrays for training and testing sets.
- `configX`, `configY`: Scaling configuration for X and Y.
- `keyNamesX`, `trainLabelKeyNames`: Key names reflecting feature weights.

### 2. `parseProductionX`

Designed for production environments, this function parses and scales feature data for unseen production datasets. Like `parseTrainingXY`, it includes options for feature weighting and scaling.

#### Parameters:
- `arrObj` (Array of Objects): Input data array for production.
- `weights` (Object, optional): Feature weights for scaling.
- `xCallbackFunc` (Function): Custom function to parse X for each object. Return null or undefined to exclude it from production.
- `forceScaling` (String, optional): Forces a specific scaling approach for each feature.

#### Returns:
- `X`: Scaled feature array for production data.
- `configX`: Scaling configuration for production data.
- `keyNamesX`: Key names reflecting feature weights.

---

## Helper Functions for Custom Data Parsing

### `xCallbackFunc`

The `xCallbackFunc` function is used to extract specific feature values from each row of data, defining what the model will use as input. By selecting relevant fields in the dataset, `xCallbackFunc` ensures only the necessary values are included in the model’s feature set, allowing for streamlined preprocessing and improved model performance.

### `yCallbackFunc`

The `yCallbackFunc` function defines the target output (or Y) that the machine learning model will learn to predict. This function typically creates Y by comparing each row of data with a future data point, which is especially useful in time-series data for predictive tasks. In our example, `yCallbackFunc` generates Y based on changes between the current and next rows, which can help the model learn to predict directional trends.


### 3. `descaleArrayObj`

The `descaleArrayObj` function reverses the scaling applied to a dataset, reconstructing the original values from the scaled data. It supports both normalization and standardization approaches, making it compatible with the scaled outputs of `parseTrainingXY` and `parseProductionX`.


#### Parameters:
- `scaled`: scaled array returned from `parseTrainingXY` (`trainX`, `trainY`, `testX` or `testY`) or `parseProductionX` (`X`).
- `config`: config object returned from `parseTrainingXY` (`configX`, `configY`) or `parseProductionX` (`configX`).
- `keyNames`: keyNames array returned from `parseTrainingXY` (`keyNamesX`, `keyNamesY`) or `parseProductionX` (`keyNamesX`).

#### Returns:

The output of this function in an array of objects similar or equal to the input array of objects submited to `parseTrainingXY` or `parseProductionX`.

### 4. `arrayToTimesteps`

The `arrayToTimesteps` function transforms a flat array into an array of overlapping sequences of a specified length. This is a common preprocessing step for time-series or sequential data models.

#### Parameters:
- `arr` (Array): The input array to be converted into timesteps.
- `timeSteps` (Number): The number of elements in each timestep sequence.
  - Must be greater than `0`.
  - If `timeSteps === 0`, the function returns the original array unchanged.

#### Returns:
An array of sub-arrays, where each sub-array contains `timeSteps` consecutive elements from the original array.

#### Throws:
- An error if `timeSteps < 0`, with the message: `"timeSteps must be greater than 0"`.


---

## Usage Examples

1. **Parsing and Splitting a Training Dataset:**

```javascript
    import { parseTrainingXY, arrayToTimesteps } from 'xy-scale';
    import { loadFile } from "./test/fs.js" 
    import * as tf from '@tensorflow/tfjs-node';

    // [{open, high, low, close}, {open, high, low, close}]
    const myArray = await loadFile({fileName: '1d-spy.json', pathName: 'datasets'}) //file in /datasets/1d-spy.json
    
    //callback function used to prepare X before scaling
    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index]
        const prev = objRow[index - 1]

        //returning null or undefined will exclude current row X and Y from training
        if(typeof prev === 'undefined') return null

        const { open, high, low, close } = curr

        return {
            change: open - prev.close,
            top: high - Math.max(open, close),
            bottom: low - Math.min(open, close),
            body: open-close,
        }
    }

    //callback function used to prepare Y before scaling
    const yCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const next = objRow[index + 1];

        //returning null or undefined will exclude current row X and Y from training
        if (typeof next === 'undefined') return null;

        return {
            label_1: next.open > curr.close,
            label_2: next.close > curr.close,
        };
    };
    
    const {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    } = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.90,
        yCallbackFunc,
        xCallbackFunc,
        forceScaling: 'normalization',
    });


    console.log('testX', testX.slice(-2))


    const timeSteps = 10
    const colsX = trainX[0].length
    const colsY = trainY[0].length
    const timeSteppedTrainX = arrayToTimesteps(trainX, timeSteps)
    const trimedTrainY = trainY.slice(timeSteps-1)


    console.log([trainX.length, timeSteps, timeSteppedTrainX[0][0].length])

    const inputX = tf.tensor3d(timeSteppedTrainX, [timeSteppedTrainX.length, timeSteps, colsX])
    const targetY = tf.tensor2d(trimedTrainY,  [trimedTrainY.length, colsY])


    console.log('inputX', inputX)
    console.log('inputX', targetY)
    
```

---

## Technical Details

- **Error Handling**: Validates scaling approach values and ensures positive feature weights.
- **Single-Pass Calculations**: Efficient single-pass statistics calculation for mean and variance.
- **Customizable**: Supports custom parsing functions, configurable feature weighting, and forced scaling.