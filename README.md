# Scale Array Object Utility for Data Processing - GitHub Repository

## Overview

This repository provides utilities for scaling and preparing datasets in JavaScript, with a primary focus on data preprocessing for machine learning applications. The main functionality includes scaling numerical and categorical data and splitting datasets into training and testing sets.

The primary functions, `parseTrainingDataset` and `parseProductionDataset`, offer a flexible and modular approach to data handling, allowing users to define custom scaling approaches, weighting of features, and specific parsing rules for features and labels.

---

## Installation

`$ npm i xy-scale`

---

## Main Functions

### 1. `parseTrainingDataset`

This function prepares a dataset for supervised learning by parsing, scaling, and splitting it into training and testing subsets. It includes configurable options for feature weighting and scaling approaches.

#### Parameters:
- `arrObj` (Array of Objects): Input data array containing all features and labels.
- `trainingSplit` (Number, optional): Defines the training dataset size (default `0.8`).
- `weights` (Object, optional): Feature weights for scaling.
- `parseLabels` (Function): Custom function to parse labels for each object.
- `parseFeatures` (Function): Custom function to parse features for each object.
- `forceScaling` (String, optional): Forces a specific scaling approach for each feature.

#### Features:
- **Label and Feature Parsing**: Custom parsing for labels and features based on user-defined functions.
- **Configurable Scaling and Splitting**: Scales features and labels independently and splits data into training and testing sets.

#### Scaling Approaches:
- **Normalization**: Scales values to a range of `[0, 1]`.
- **Standardization**: Scales values to have a mean of `0` and standard deviation of `1`.
- **Automatic Selection (Default)**: If `forceScaling = null`, the function automatically selects between `'normalization'` and `'standardization'` for each feature. 
    - **Normalization** is chosen for features with lower variance (small difference between mean and standard deviation), scaling values to a `[0, 1]` range.
    - **Standardization** is applied when higher variance is detected (large difference between mean and standard deviation), centering values with a mean of `0` and a standard deviation of `1`.

    This adaptive scaling approach ensures the most effective transformation is applied based on each feature's statistical properties.

#### Returns:
- `trainFeatures`, `trainLabels`, `testFeatures`, `testLabels`: Scaled feature and label arrays for training and testing sets.
- `trainFeaturesConfig`, `trainLabelsConfig`: Scaling configuration for features and labels.
- `trainFeaturesKeyNames`, `trainLabelKeyNames`: Key names reflecting feature weights.

### 2. `parseProductionDataset`

Designed for production environments, this function parses and scales feature data for unseen production datasets. Like `parseTrainingDataset`, it includes options for feature weighting and scaling.

#### Parameters:
- `arrObj` (Array of Objects): Input data array for production.
- `weights` (Object, optional): Feature weights for scaling.
- `parseFeatures` (Function): Custom function to parse features for each object.
- `forceScaling` (String, optional): Forces a specific scaling approach for each feature.

#### Returns:
- `productionFeatures`: Scaled feature array for production data.
- `productionFeaturesConfig`: Scaling configuration for production data.
- `productionFeaturesKeyNames`: Key names reflecting feature weights.

---

## Usage Examples

1. **Parsing and Splitting a Training Dataset:**

    ```javascript
    import { parseTrainingDataset } from './scale.js';

    const myArray = [
        { open: 135.23, high: 137.45, low: 134.56, sma_200: 125.34, sma_100: 130.56 },
        { open: 136.45, high: 138.67, low: 135.67, sma_200: 126.78, sma_100: 131.45 },
        { open: 137.89, high: 139.34, low: 136.34, sma_200: 127.56, sma_100: 132.78 }
    ];

    const parseFeatures = ({ objRow, index }) => {
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

    const parseLabels = ({ objRow, index }) => {
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

    const trainingData = parseTrainingDataset({
        arrObj: myArray,
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        parseLabels,
        parseFeatures,
        forceScaling: 'normalization'
    });
    ```

2. **Parsing a Production Dataset:**

    ```javascript
    import { parseProductionDataset } from './scale.js';

    const parseFeatures = ({ objRow, index }) => {
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

    const productionData = parseProductionDataset({
        arrObj: productionArray,
        weights: { open: 2, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        parseFeatures: (row) => row.features,
        forceScaling: null
    });
    ```

---

## Technical Details

- **Error Handling**: Validates scaling approach values and ensures positive feature weights.
- **Single-Pass Calculations**: Efficient single-pass statistics calculation for mean and variance.
- **Customizable**: Supports custom parsing functions, configurable feature weighting, and forced scaling.