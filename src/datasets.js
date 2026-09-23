import { arrayShuffle } from './utilities.js';
import { validateArray, validateFirstRow, validateSizes, isKeyPairObject, isNumber } from './validators.js';
import { zscore } from './zscore.js';

const currentRow = ({ objRow, index }) => objRow[index];

const validateScaling = scaling => {
    if (scaling !== null && scaling !== 'zscore') {
        throw new Error('Invalid "scaling" property. Accepting null or "zscore".');
    }
};

const getKeys = (value, expectedKeys, callbackName) => {
    if (!isKeyPairObject(value)) {
        throw new Error(`"${callbackName}" must return a non-empty object.`);
    }

    const keys = Object.keys(value);
    if (expectedKeys !== null &&
        (keys.length !== expectedKeys.length || expectedKeys.some(key => !Object.hasOwn(value, key)))) {
        throw new Error(`"${callbackName}" returned inconsistent keys. Expected: ${expectedKeys.join(', ')}.`);
    }

    return expectedKeys ?? keys;
};

const parseFeatures = (value, expectedKeys, callbackName) => {
    const keys = getKeys(value, expectedKeys, callbackName);
    const values = keys.map(key => value[key]);

    for (let i = 0; i < values.length; i++) {
        if (!isNumber(values[i])) {
            throw new Error(`Invalid numeric value returned from "${callbackName}" for key "${keys[i]}".`);
        }
    }

    return { keys, values };
};

const hasInvalidLabelValue = value =>
    value == null ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    (Array.isArray(value) && value.some(hasInvalidLabelValue));

const parseLabels = (value, expectedKeys) => {
    const keys = getKeys(value, expectedKeys, 'yCallbackFunc');
    const values = keys.map(key => value[key]);

    for (let i = 0; i < values.length; i++) {
        if (hasInvalidLabelValue(values[i])) {
            throw new Error(`Invalid label value returned from "yCallbackFunc" for key "${keys[i]}".`);
        }
    }

    return { keys, values };
};

const countLabels = (rows, keyNames) => {
    const counts = new Map(keyNames.map(key => [key, new Map()]));

    for (const row of rows) {
        for (let i = 0; i < keyNames.length; i++) {
            const value = row.y[i];
            const label = Array.isArray(value) ? JSON.stringify(value) : String(value);
            const keyCounts = counts.get(keyNames[i]);
            keyCounts.set(label, (keyCounts.get(label) ?? 0) + 1);
        }
    }

    return Object.fromEntries(Array.from(counts, ([key, values]) => [key, Object.fromEntries(values)]));
};

export const parseTrainingXY = ({
    arrObj = [],
    trainSize = null,
    testSize = null,
    yCallbackFunc = currentRow,
    xCallbackFunc = currentRow,
    validateRows = () => true,
    shuffle = false,
    state = {},
    showSource = false,
    scaling = null
}) => {
    validateArray(arrObj, { min: 1 }, 'parseTrainingXY');
    validateSizes({ arrObjSize: arrObj.length, trainSize, testSize });
    validateScaling(scaling);

    let keyNamesX = null;
    let keyNamesY = null;
    let checkedFirstIncludedRow = false;
    const rows = [];

    for (let index = 0; index < arrObj.length; index++) {
        try {
            const context = { objRow: arrObj, index, state };
            if (!validateRows(context)) continue;

            const parsedX = xCallbackFunc(context);
            const parsedY = yCallbackFunc(context);
            if (parsedX == null || parsedY == null) continue;

            if (!checkedFirstIncludedRow) {
                validateFirstRow(arrObj[index]);
                checkedFirstIncludedRow = true;
            }

            const x = parseFeatures(parsedX, keyNamesX, 'xCallbackFunc');
            const y = parseLabels(parsedY, keyNamesY);
            keyNamesX = x.keys;
            keyNamesY = y.keys;
            rows.push({ x: x.values, y: y.values, source: arrObj[index] });
        } catch (err) {
            throw new Error(`[parseTrainingXY] Row index=${index}: ${err.message}`, { cause: err });
        }
    }

    const totalSize = trainSize + testSize;
    if (rows.length < totalSize) {
        throw new Error(`[parseTrainingXY] Expected ${totalSize} eligible rows, got ${rows.length}.`);
    }

    const selected = (shuffle ? arrayShuffle(rows) : rows).slice(-totalSize);
    const training = selected.slice(0, trainSize);
    const testing = selected.slice(trainSize);

    let trainX = training.map(row => row.x);
    let testX = testing.map(row => row.x);
    let stats = null;

    if (scaling === 'zscore') {
        const fitted = zscore(trainX);
        trainX = fitted.data;
        stats = { ...fitted.stats, keyNames: [...keyNamesX] };
        testX = zscore(testX, stats).data;
    }

    return {
        trainX,
        trainY: training.map(row => row.y),
        testX,
        testY: testing.map(row => row.y),
        configX: { keyNames: keyNamesX ?? [] },
        configY: {
            keyNames: keyNamesY ?? [],
            labelCounts: countLabels(selected, keyNamesY ?? [])
        },
        trainSource: showSource ? training.map(row => row.source) : undefined,
        testSource: showSource ? testing.map(row => row.source) : undefined,
        stats
    };
};

export const parseProductionX = ({
    arrObj = [],
    xCallbackFunc = currentRow,
    yCallbackFunc = null,
    validateRows = () => true,
    shuffle = false,
    state = {},
    showSource = false,
    scaling = null,
    stats
}) => {
    validateArray(arrObj, { min: 1 }, 'parseProductionX');
    validateScaling(scaling);

    if (yCallbackFunc != null) {
        throw new Error('The property "yCallbackFunc" must not be set in "parseProductionX".');
    }
    if (scaling === 'zscore' && stats == null) {
        throw new Error('"stats" from training are required when production scaling is "zscore".');
    }
    if (scaling === 'zscore' &&
        (!Array.isArray(stats.keyNames) || stats.keyNames.length === 0 ||
         !Array.isArray(stats.mean) || stats.keyNames.length !== stats.mean.length ||
         stats.keyNames.some(key => typeof key !== 'string'))) {
        throw new Error('Production scaling requires fitted statistics with feature key names.');
    }

    let keyNamesX = null;
    let checkedFirstIncludedRow = false;
    const rows = [];

    for (let index = 0; index < arrObj.length; index++) {
        try {
            const context = { objRow: arrObj, index, state };
            if (!validateRows(context)) continue;

            const parsedX = xCallbackFunc(context);
            if (parsedX == null || parsedX === false) continue;

            if (!checkedFirstIncludedRow) {
                validateFirstRow(arrObj[index]);
                checkedFirstIncludedRow = true;
            }

            const x = parseFeatures(parsedX, keyNamesX, 'xCallbackFunc');
            keyNamesX = x.keys;
            rows.push({ x: x.values, source: arrObj[index] });
        } catch (err) {
            throw new Error(`[parseProductionX] Row index=${index}: ${err.message}`, { cause: err });
        }
    }

    const selected = shuffle ? arrayShuffle(rows) : rows;
    let X = selected.map(row => row.x);
    if (scaling === 'zscore') {
        if (keyNamesX !== null &&
            (keyNamesX.length !== stats.keyNames.length ||
             keyNamesX.some((key, index) => key !== stats.keyNames[index]))) {
            throw new Error('Production feature keys must match the training feature order.');
        }
        X = zscore(X, stats).data;
    }

    return {
        X,
        source: showSource ? selected.map(row => row.source) : [],
        configX: { keyNames: keyNamesX ?? [] }
    };
};
