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
- `timeSteps` (Number, optional): Transforms a one-dimensional array into an array of overlapping sequences (timesteps), each of a specified length. Default is 0 returning original output.

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
- `timeSteps` (Number, optional): Transforms a one-dimensional array into an array of overlapping sequences (timesteps), each of a specified length. Default is 0 returning original output.

#### Returns:
- `X`: Scaled feature array for production data.
- `configX`: Scaling configuration for production data.
- `keyNamesX`: Key names reflecting feature weights.

## Helper Callback Functions for Custom Data Parsing

### `xCallbackFunc`

The `xCallbackFunc` function is used to extract specific feature values from each row of data, defining what the model will use as input. By selecting relevant fields in the dataset, `xCallbackFunc` ensures only the necessary values are included in the model’s feature set, allowing for streamlined preprocessing and improved model performance.

### `yCallbackFunc`

The `yCallbackFunc` function defines the target output (or Y) that the machine learning model will learn to predict. This function typically creates Y by comparing each row of data with a future data point, which is especially useful in time-series data for predictive tasks. In our example, `yCallbackFunc` generates Y based on changes between the current and next rows, which can help the model learn to predict directional trends.


---

## Usage Examples

1. **Parsing and Splitting a Training Dataset:**

```javascript
    import { parseTrainingXY } from './scale.js';

    const myArray = [
        { open: 135.23, high: 137.45, low: 134.56, sma_200: 125.34, sma_100: 130.56 },
        { open: 136.45, high: 138.67, low: 135.67, sma_200: 126.78, sma_100: 131.45 },
        { open: 137.89, high: 139.34, low: 136.34, sma_200: 127.56, sma_100: 132.78 }
    ];

    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const { open, high, low, sma_200, sma_100 } = curr;

        return {
            open,
            high,
            low,
            sma_200,
            sma_100
        };
    };

    const yCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const next = objRow[index + 1];

        //returning null or undefined will exclude current row X and Y from training
        if (typeof next === 'undefined') return null;

        return {
            label_1: next.open > curr.open,       // Label indicating if the next open price is higher than the current
            label_2: next.high > curr.high,       // Label indicating if the next high price is higher than the current
            label_3: next.low > curr.low,         // Label indicating if the next low price is higher than the current
            label_4: next.sma_200 > curr.sma_200, // Label indicating if the next 200-day SMA is higher than the current
            label_5: next.sma_100 > curr.sma_100  // Label indicating if the next 100-day SMA is higher than the current
        };
    };

    const const {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    } = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        yCallbackFunc,
        xCallbackFunc,
        forceScaling: 'normalization',
        timeSteps: 0
    });

    
```


2. **Parsing a Production Dataset:**

```javascript
    import { parseProductionX } from './scale.js'
    import {descaleArrayObj} from './descale.js'

    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const { open, high, low, sma_200, sma_100 } = curr;

        return {
            open,
            high,
            low,
            sma_200,
            sma_100
        };
    };

    const myArray = [
        { open: 135.23, high: 137.45, low: 134.56, sma_200: 125.34, sma_100: 130.56 },
        { open: 136.45, high: 138.67, low: 135.67, sma_200: 126.78, sma_100: 131.45 },
        { open: 137.89, high: 139.34, low: 136.34, sma_200: 127.56, sma_100: 132.78 }
    ];

    const {X, configX, keyNamesX} = parseProductionX({
        arrObj: myArray,
        weights: { open: 2, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        xCallbackFunc,
        forceScaling: null,
        timeSteps: 0
    });

    console.log('productionData.X', productionData.X)
    console.log('descaled array be equal to myArray', descaleArrayObj({scaled: X, config: configX, keyNames: keyNamesX}))

```

---

### Upcoming Feature: Optional Precision Handling with Big.js and BigNumber.js

In the next release, we are introducing an optional **precision** feature to enhance decimal precision in financial and scientific datasets. This feature will allow users to integrate **Big.js** or **BigNumber.js** libraries seamlessly into their data processing workflow by adding a new `precision` property to the parameters of `parseTrainingXY` and `parseProductionX`.

#### How Precision Handling Will Work

With the new `precision` property, users can pass either Big.js or BigNumber.js as callback functions to handle high-precision decimal calculations. This makes the integration fully optional, allowing flexibility based on the precision requirements of the dataset. When `precision` is set, the toolkit will use the specified library for all numeric computations, ensuring high precision and minimizing rounding errors.

1. **Future Example Usage:**

```javascript
    import Big from 'big.js';
    import BigNumber from 'bignumber.js';
    import { parseTrainingXY, parseProductionX } from './scale.js';

    const myArray = [
        { open: 135.23, high: 137.45, low: 134.56, sma_200: 125.34, sma_100: 130.56 },
        { open: 136.45, high: 138.67, low: 135.67, sma_200: 126.78, sma_100: 131.45 },
        { open: 137.89, high: 139.34, low: 136.34, sma_200: 127.56, sma_100: 132.78 }
    ];

    const trainingData = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        yCallbackFunc,
        xCallbackFunc,
        precision: Big, // Big or BigNumber callbacks for high-precision calculations
        forceScaling: 'normalization',
        timeSteps: 0
    });
```

---

## Technical Details

- **Error Handling**: Validates scaling approach values and ensures positive feature weights.
- **Single-Pass Calculations**: Efficient single-pass statistics calculation for mean and variance.
- **Customizable**: Supports custom parsing functions, configurable feature weighting, and forced scaling.