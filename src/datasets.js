import { arrayShuffle, isBadNumber } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";
import { validateFirstRow, validateArray, hasInvalidNumbers } from "./validators.js";

export const parseTrainingXY = ({
    arrObj = [], // array of objects
    trainingSplit = 0.8, // numeric float between 0.01 and 0.99
    yCallbackFunc = row => row, // accepted callback functions
    xCallbackFunc = row => row, // accepted callback functions
    validateRows = () => true, // accepted callback functions
    shuffle = false, // only booleans
    balancing = '', // accepted '', 'oversample' or 'undersample'
    state = {}, // accepted object or classes
}) => {
    let X = []
    let Y = []
    const sourceIndexes = []

    validateArray(arrObj, { min: 2 }, 'parseTrainingXY')
    validateFirstRow(arrObj[0])

    for (let x = 0; x < arrObj.length; x++) {
        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state })
            const parsedY = yCallbackFunc({ objRow: arrObj, index: x, state })

            if (parsedX != null && parsedY != null) {

                if(hasInvalidNumbers(parsedX, 'parseTrainingXY')) {

                    throw new Error(`[BUG] - Skipped row index=${x}`)
                }

                X.push(parsedX);
                Y.push(parsedY);
                sourceIndexes.push(x);
            }
        } catch(err) {
            throw new Error(`[BUG] - Skipped row index=${x}: ${err.message}`)
        }
    }

    if (shuffle) {
        const merged = new Array(X.length);

        for (let i = 0; i < X.length; i++) {
            merged[i] = {
                x: X[i],
                y: Y[i],
                sourceIndex: sourceIndexes[i],
            };
        }

        const shuffled = arrayShuffle(merged);

        X = new Array(shuffled.length);
        Y = new Array(shuffled.length);

        for (let i = 0; i < shuffled.length; i++) {
            X[i] = shuffled[i].x;
            Y[i] = shuffled[i].y;
            sourceIndexes[i] = shuffled[i].sourceIndex;
        }
    }

    const xLen = X.length;
    const yLen = Y.length;


    const xKeys = xLen ? Object.keys(X[0]) : [];
    const yKeys = yLen ? Object.keys(Y[0]) : [];

    const flatX = new Array(xLen);
    const flatY = new Array(yLen);

    const configX = {
        keyNames: xKeys,
    };

    for (let idx = 0; idx < xLen; idx++) {
        const rowObj = X[idx];
        const sourceIndex = sourceIndexes[idx];
        const flatRow = new Array(xKeys.length);

        for (let j = 0; j < xKeys.length; j++) {
            const key = xKeys[j];
            const value = rowObj[key];

            if (isBadNumber(value)) {
                throw new Error(
                    `Invalid property value (${value}) returned from "xCallbackFunc" on index "${sourceIndex}" property "${key}".`
                );
            }

            flatRow[j] = value;
        }

        flatX[idx] = flatRow;
    }

    const toLabelKey = value => Array.isArray(value)
        ? JSON.stringify(value)
        : String(value);

    const initLabelCounts = keyNames =>
        Object.fromEntries(
            keyNames.map(keyName => [keyName, ({})])
        );

    const configY = {
        keyNames: yKeys,
        labelCounts: initLabelCounts(yKeys),
    };

    for (let idx = 0; idx < yLen; idx++) {
        const rowObj = Y[idx];
        const flatRow = new Array(yKeys.length);

        for (let j = 0; j < yKeys.length; j++) {
            const keyName = yKeys[j];
            const value = rowObj[keyName];

            flatRow[j] = value;

            const labelKey = toLabelKey(value);
            configY.labelCounts[keyName][labelKey] =
                (configY.labelCounts[keyName][labelKey] ?? 0) + 1;
        }

        flatY[idx] = flatRow;
    }

    const splitIndex = Math.floor(flatX.length * trainingSplit);

    let trainX = flatX.slice(0, splitIndex);
    let trainY = flatY.slice(0, splitIndex);
    let testX = flatX.slice(splitIndex);
    let testY = flatY.slice(splitIndex);

    if (balancing) {
        let balance;

        if (balancing === 'oversample') {
            balance = oversampleXY(trainX, trainY);
            trainX = balance.X;
            trainY = balance.Y;
        } else if (balancing === 'undersample') {
            balance = undersampleXY(trainX, trainY);
            trainX = balance.X;
            trainY = balance.Y;
        } else {
            throw Error('balancing argument only accepts "", "oversample" and "undersample". Defaults to "".');
        }
    }

    return {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        configY,
    };
};

export const parseProductionX = ({
    arrObj = [],
    xCallbackFunc = row => row,
    yCallbackFunc = null,
    validateRows = () => true,
    shuffle = false,
    state = {},
}) => {
    let X = [];
    let sourceIndexes = [];

    validateArray(arrObj, { min: 1 }, 'parseProductionX');
    validateFirstRow(arrObj[0]);

    if (yCallbackFunc != null) {
        throw new Error('The property "yCallbackFunc" must not be set in "parseProductionX".');
    }

    for (let x = 0; x < arrObj.length; x++) {
        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state });

            if (parsedX != null) {

                if(hasInvalidNumbers(parsedX, 'parseProductionX')) {
                    throw new Error(`[BUG] - Skipped row index=${x}`)
                }
                 
                X.push(parsedX)
                sourceIndexes.push(x)
                
            }
        } catch(err) {
            throw new Error(`[BUG] - Skipped row index=${x}: ${err.message}`);
        }
    }

    if (shuffle) {
        const merged = new Array(X.length);

        for (let i = 0; i < X.length; i++) {
            merged[i] = {
                x: X[i],
                sourceIndex: sourceIndexes[i],
            };
        }

        const shuffled = arrayShuffle(merged);

        X = new Array(shuffled.length);
        sourceIndexes = new Array(shuffled.length);

        for (let i = 0; i < shuffled.length; i++) {
            X[i] = shuffled[i].x;
            sourceIndexes[i] = shuffled[i].sourceIndex;
        }
    }

    const xLen = X.length;
    const xKeys = xLen ? Object.keys(X[0]) : [];
    const flatX = new Array(xLen);

    const configX = {
        keyNames: xKeys,
    };

    for (let idx = 0; idx < xLen; idx++) {
        const rowObj = X[idx];
        const sourceIndex = sourceIndexes[idx];
        const flatRow = new Array(xKeys.length);

        for (let j = 0; j < xKeys.length; j++) {
            const key = xKeys[j];
            const value = rowObj[key];

            if (isBadNumber(value)) {
                throw new Error(
                    `Invalid property value (${value}) returned from "xCallbackFunc" on index "${sourceIndex}" property "${key}".`
                );
            }

            flatRow[j] = value;
        }

        flatX[idx] = flatRow;
    }

    return {
        X: flatX,
        configX,
    };
};