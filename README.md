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
- `yCallbackFunc` (Function): Custom function to parse Y for each object.
- `xCallbackFunc` (Function): Custom function to parse X for each object.
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
- `trainXConfig`, `trainYConfig`: Scaling configuration for X and Y.
- `trainXKeyNames`, `trainLabelKeyNames`: Key names reflecting feature weights.

### 2. `parseProductionX`

Designed for production environments, this function parses and scales feature data for unseen production datasets. Like `parseTrainingXY`, it includes options for feature weighting and scaling.

#### Parameters:
- `arrObj` (Array of Objects): Input data array for production.
- `weights` (Object, optional): Feature weights for scaling.
- `xCallbackFunc` (Function): Custom function to parse X for each object.
- `forceScaling` (String, optional): Forces a specific scaling approach for each feature.
- `timeSteps` (Number, optional): Transforms a one-dimensional array into an array of overlapping sequences (timesteps), each of a specified length. Default is 0 returning original output.

#### Returns:
- `x`: Scaled feature array for production data.
- `xConfig`: Scaling configuration for production data.
- `xKeyNames`: Key names reflecting feature weights.

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

        if (typeof next === 'undefined') return null;

        return {
            label_1: next.open > curr.open,       // Label indicating if the next open price is higher than the current
            label_2: next.high > curr.high,       // Label indicating if the next high price is higher than the current
            label_3: next.low > curr.low,         // Label indicating if the next low price is higher than the current
            label_4: next.sma_200 > curr.sma_200, // Label indicating if the next 200-day SMA is higher than the current
            label_5: next.sma_100 > curr.sma_100  // Label indicating if the next 100-day SMA is higher than the current
        };
    };

    const trainingData = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        yCallbackFunc,
        xCallbackFunc,
        forceScaling: 'normalization',
        timeSteps: 0
    });
```

**Output:**
```json
    {"trainX":[[0,0,0,0,0]],"trainY":[[0,0,0,0,0]],"testX":[[1,1,1,1,1]],"testY":[[0,0,0,0,0]],"trainXConfig":{"min":{"open":135.23,"high":137.45,"low":134.56,"sma_200":125.34,"sma_100":130.56},"max":{"open":136.45,"high":138.67,"low":135.67,"sma_200":126.78,"sma_100":131.45},"std":{"open":0.8626702730475972,"high":0.8626702730475772,"low":0.7848885271170473,"sma_200":1.0182337649086268,"sma_100":0.6293250352560177},"mean":{"open":135.83999999999997,"high":138.06,"low":135.115,"sma_200":126.06,"sma_100":131.005},"approach":{"open":"normalization","high":"normalization","low":"normalization","sma_200":"normalization","sma_100":"normalization"},"inputTypes":{"open":"number","high":"number","low":"number","sma_200":"number","sma_100":"number"},"uniqueStringIndexes":{}},"trainXKeyNames":["open","high","low","sma_200","sma_100"],"trainYConfig":{"min":{"label_1":true,"label_2":true,"label_3":true,"label_4":true,"label_5":true},"max":{"label_1":true,"label_2":true,"label_3":true,"label_4":true,"label_5":true},"std":{"label_1":0,"label_2":0,"label_3":0,"label_4":0,"label_5":0},"mean":{"label_1":1,"label_2":1,"label_3":1,"label_4":1,"label_5":1},"approach":{"label_1":"normalization","label_2":"normalization","label_3":"normalization","label_4":"normalization","label_5":"normalization"},"inputTypes":{"label_1":"boolean","label_2":"boolean","label_3":"boolean","label_4":"boolean","label_5":"boolean"},"uniqueStringIndexes":{}},"trainYKeyNames":["label_1","label_2","label_3","label_4","label_5"]}
```

2. **Parsing a Production Dataset:**

```javascript
    import { parseProductionX } from './scale.js';

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

    const productionData = parseProductionX({
        arrObj: myArray,
        weights: { open: 2, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        xCallbackFunc,
        forceScaling: null,
        timeSteps: 0
    });
```

**Output:**

```json
        {"x":[[-0.9713243322194223,-0.9713243322194223,0,0,-1.0832575234857975,-0.9278787875246485],[-0.05507509100212526,-0.05507509100212526,0.6455026455026398,0.6235955056179688,0.19534152062858562,-0.1312754554697336],[1.026399423221569,1.026399423221569,1,1,0.887916002857212,1.059154242994382]],"xConfig":{"min":{"open":135.23,"high":137.45,"low":134.56,"sma_200":125.34,"sma_100":130.56},"max":{"open":137.89,"high":139.34,"low":136.34,"sma_200":127.56,"sma_100":132.78},"std":{"open":1.3315154273733958,"high":0.9582449234581516,"low":0.899017982764145,"sma_200":1.1262326580240862,"sma_100":1.1172436320397328},"mean":{"open":136.5233333333333,"high":138.48666666666668,"low":135.52333333333334,"sma_200":126.56,"sma_100":131.59666666666666},"approach":{"open":"standardization","high":"normalization","low":"normalization","sma_200":"standardization","sma_100":"standardization"},"inputTypes":{"open":"number","high":"number","low":"number","sma_200":"number","sma_100":"number"},"uniqueStringIndexes":{}},"xKeyNames":["open","open","high","low","sma_200","sma_100"]}
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