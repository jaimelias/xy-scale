import { arrayShuffle } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";
import { validateFirstRow, validateArray, hasInvalidNumbers } from "./validators.js";

export const parseTrainingXY = ({
    arrObj = [],
    trainingSplit = 0.8,
    yCallbackFunc = row => row,
    xCallbackFunc = row => row,
    validateRows = () => true,
    shuffle = false,
    balancing = '',
    state = {},
}) => {
    validateArray(arrObj, { min: 2 }, 'parseTrainingXY');
    validateFirstRow(arrObj[0]);

    let flatX = [];
    let flatY = [];

    let keyNamesX = null;
    let keyNamesY = null;

    const labelCounts = {};

    for (let x = 0; x < arrObj.length; x++) {
        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state });
            const parsedY = yCallbackFunc({ objRow: arrObj, index: x, state });

            if (parsedX == null || parsedY == null) continue;

            if (hasInvalidNumbers(parsedX, 'parseTrainingXY')) {
               throw new Error(`Invalid numeric value returned from "xCallbackFunc".`);
            }

            if (keyNamesX === null) {
                keyNamesX = Object.keys(parsedX);
            }

            if (keyNamesY === null) {
                keyNamesY = Object.keys(parsedY);

                for (let i = 0; i < keyNamesY.length; i++) {
                    labelCounts[keyNamesY[i]] = {};
                }
            }

            const rowX = new Array(keyNamesX.length);
            const rowY = new Array(keyNamesY.length);

            for (let i = 0; i < keyNamesX.length; i++) {
                const key = keyNamesX[i];
                const value = parsedX[key];

                rowX[i] = value;
            }

            for (let i = 0; i < keyNamesY.length; i++) {
                const key = keyNamesY[i];
                const value = parsedY[key];

                rowY[i] = value;

                //labels can be arrays, booleans, numbers or strings
                const labelKey = Array.isArray(value)
                    ? JSON.stringify(value)
                    : String(value);

                labelCounts[key][labelKey] = (labelCounts[key][labelKey] ?? 0) + 1;
            }

            flatX.push(rowX);
            flatY.push(rowY);
        } catch(err) {
            throw new Error(`[BUG] - Skipped row index=${x}: ${err.message}`);
        }
    }

    if (shuffle) {
        const merged = new Array(flatX.length);

        for (let i = 0; i < flatX.length; i++) {
            merged[i] = {
                x: flatX[i],
                y: flatY[i]
            };
        }

        const shuffled = arrayShuffle(merged);

        flatX = new Array(shuffled.length);
        flatY = new Array(shuffled.length);

        for (let i = 0; i < shuffled.length; i++) {
            flatX[i] = shuffled[i].x;
            flatY[i] = shuffled[i].y;
        }
    }

    const configX = {
        keyNames: keyNamesX ?? [],
    };

    const configY = {
        keyNames: keyNamesY ?? [],
        labelCounts,
    };

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
    let flatX = [];
    let keyNamesX = null;

    validateArray(arrObj, { min: 1 }, 'parseProductionX');
    validateFirstRow(arrObj[0]);

    if (yCallbackFunc != null) {
        throw new Error('The property "yCallbackFunc" must not be set in "parseProductionX".');
    }

    for (let x = 0; x < arrObj.length; x++) {
        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state });

            if (parsedX == null) continue;

            if (hasInvalidNumbers(parsedX, 'parseProductionX')) {
                throw new Error(`Invalid numeric value returned from "xCallbackFunc".`);
            }

            if (keyNamesX === null) {
                keyNamesX = Object.keys(parsedX)
            }

            const rowX = new Array(keyNamesX.length);

            for (let i = 0; i < keyNamesX.length; i++) {
                const key = keyNamesX[i];
                const value = parsedX[key];

                rowX[i] = value;
            }

            flatX.push(rowX);
        } catch(err) {
            throw new Error(`[BUG] - Skipped row index=${x}: ${err.message}`);
        }
    }

    if (shuffle) {
         flatX = arrayShuffle(flatX)
    }

    const configX = {
        keyNames: keyNamesX ?? [],
    };

    return {
        X: flatX,
        configX,
    };
};