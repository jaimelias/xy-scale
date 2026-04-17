import { arrayShuffle, isBadNumber } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";
import { validateFirstRow, validateArray } from "./validators.js";

// ADD A PARAM max correlation that will measure the correlation between variables if defined

const isPlainObject = value =>
    Object.prototype.toString.call(value) === '[object Object]';

const getRowKind = row => {
    if (Array.isArray(row)) return 'array';
    if (isPlainObject(row)) return 'object';
    return typeof row;
};

const getComparableKeys = row =>
    Object.keys(row).filter(key => key !== 'tempIdx');

const buildPath = ({ parentPath = '', key, isArrayParent = false }) => {
    const nextPart = isArrayParent ? `[${key}]` : (parentPath ? `.${key}` : `${key}`);
    return `${parentPath}${nextPart}`;
};

const createStrictSchemaError = ({
    rowLabel,
    sourceIndex,
    path = '',
    detail,
    strictFlagName,
}) => {
    const pathText = path ? ` path "${path}"` : '';
    return new Error(
        `${rowLabel} schema error at index "${sourceIndex}"${pathText}. ${detail} Set "${strictFlagName}" to false to disable this validation.`
    );
};

const assertSameTopLevelSchema = ({
    referenceRow,
    currentRow,
    rowLabel,
    currentIndex,
    strictFlagName,
}) => {
    const referenceKind = getRowKind(referenceRow);
    const currentKind = getRowKind(currentRow);

    if (referenceKind !== currentKind) {
        throw createStrictSchemaError({
            rowLabel,
            sourceIndex: currentIndex,
            detail: `Expected row type "${referenceKind}" based on the first parsed ${rowLabel} row, but got "${currentKind}".`,
            strictFlagName,
        });
    }

    if (referenceKind !== 'array' && referenceKind !== 'object') {
        throw createStrictSchemaError({
            rowLabel,
            sourceIndex: currentIndex,
            detail: `Parsed ${rowLabel} rows must be arrays or plain objects.`,
            strictFlagName,
        });
    }

    const referenceKeys = getComparableKeys(referenceRow);
    const currentKeys = getComparableKeys(currentRow);

    const referenceKeySet = new Set(referenceKeys);
    const currentKeySet = new Set(currentKeys);
    const isArrayRow = Array.isArray(referenceRow);

    for (let i = 0; i < referenceKeys.length; i++) {
        const key = referenceKeys[i];

        if (!currentKeySet.has(key)) {
            throw createStrictSchemaError({
                rowLabel,
                sourceIndex: currentIndex,
                path: buildPath({ key, isArrayParent: isArrayRow }),
                detail: `Missing required ${isArrayRow ? 'index' : 'property'} "${key}" found in the first parsed ${rowLabel} row.`,
                strictFlagName,
            });
        }
    }

    for (let i = 0; i < currentKeys.length; i++) {
        const key = currentKeys[i];

        if (!referenceKeySet.has(key)) {
            throw createStrictSchemaError({
                rowLabel,
                sourceIndex: currentIndex,
                path: buildPath({ key, isArrayParent: isArrayRow }),
                detail: `Unexpected ${isArrayRow ? 'index' : 'property'} "${key}" not present in the first parsed ${rowLabel} row.`,
                strictFlagName,
            });
        }
    }

    return referenceKeys;
};

const getYValueKind = value => {
    if (Array.isArray(value)) return 'array';
    return typeof value;
};

const assertSameYValueSchema = ({
    referenceValue,
    currentValue,
    sourceIndex,
    path,
    strictFlagName,
}) => {
    const referenceKind = getYValueKind(referenceValue);
    const currentKind = getYValueKind(currentValue);

    if (referenceKind !== currentKind) {
        throw createStrictSchemaError({
            rowLabel: 'Y',
            sourceIndex,
            path,
            detail: `Expected type "${referenceKind}" based on the first parsed Y row, but got "${currentKind}".`,
            strictFlagName,
        });
    }

    if (referenceKind === 'array') {
        if (referenceValue.length !== currentValue.length) {
            throw createStrictSchemaError({
                rowLabel: 'Y',
                sourceIndex,
                path,
                detail: `Expected array length "${referenceValue.length}" based on the first parsed Y row, but got "${currentValue.length}".`,
                strictFlagName,
            });
        }

        for (let i = 0; i < referenceValue.length; i++) {
            assertSameYValueSchema({
                referenceValue: referenceValue[i],
                currentValue: currentValue[i],
                sourceIndex,
                path: buildPath({ parentPath: path, key: i, isArrayParent: true }),
                strictFlagName,
            });
        }

        return;
    }

    if (
        referenceKind !== 'number' &&
        referenceKind !== 'boolean' &&
        referenceKind !== 'string'
    ) {
        throw createStrictSchemaError({
            rowLabel: 'Y',
            sourceIndex,
            path,
            detail: `Unsupported Y value type "${referenceKind}". Y values must be numbers, booleans, strings, or nested arrays of those types.`,
            strictFlagName,
        });
    }
};

const validateStrictXRows = ({ rows, sourceIndexes, strictFlagName }) => {
    if (!rows.length) return;

    const referenceRow = rows[0];

    const compareRow = (currentRow, currentIndex) => {
        assertSameTopLevelSchema({
            referenceRow,
            currentRow,
            rowLabel: 'X',
            currentIndex,
            strictFlagName,
        });
    };

    if (rows.length > 1) {
        compareRow(rows[rows.length - 1], sourceIndexes[rows.length - 1]);
    }

    for (let i = 0; i < rows.length; i++) {
        compareRow(rows[i], sourceIndexes[i]);
    }
};

const validateStrictYRows = ({ rows, sourceIndexes, strictFlagName }) => {
    if (!rows.length) return;

    const referenceRow = rows[0];

    const compareRow = (currentRow, currentIndex) => {
        const referenceKeys = assertSameTopLevelSchema({
            referenceRow,
            currentRow,
            rowLabel: 'Y',
            currentIndex,
            strictFlagName,
        });

        const isArrayRow = Array.isArray(referenceRow);

        for (let i = 0; i < referenceKeys.length; i++) {
            const key = referenceKeys[i];
            const path = buildPath({ key, isArrayParent: isArrayRow });

            assertSameYValueSchema({
                referenceValue: referenceRow[key],
                currentValue: currentRow[key],
                sourceIndex: currentIndex,
                path,
                strictFlagName,
            });
        }
    };

    if (rows.length > 1) {
        compareRow(rows[rows.length - 1], sourceIndexes[rows.length - 1]);
    }

    for (let i = 0; i < rows.length; i++) {
        compareRow(rows[i], sourceIndexes[i]);
    }
};

export const parseTrainingXY = ({
    arrObj = [], // array of objects
    trainingSplit = 0.8, // numeric float between 0.01 and 0.99
    yCallbackFunc = row => row, // accepted callback functions
    xCallbackFunc = row => row, // accepted callback functions
    validateRows = () => true, // accepted callback functions
    shuffle = false, // only booleans
    balancing = '', // accepted '', 'oversample' or 'undersample'
    strictXSchema = true,
    strictYSchema = true,
    state = {}, // accepted object or classes
}) => {
    let X = [];
    let Y = [];
    const sourceIndexes = [];

    validateArray(arrObj, { min: 2 }, 'parseTrainingXY');
    validateFirstRow(arrObj[0]);

    for (let x = 0; x < arrObj.length; x++) {

        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state });
            const parsedY = yCallbackFunc({ objRow: arrObj, index: x, state });

            if (
                typeof parsedX !== 'undefined' &&
                parsedX !== null &&
                typeof parsedY !== 'undefined' &&
                parsedY !== null
            ) {
                X.push(parsedX);
                Y.push(parsedY);
                sourceIndexes.push(x);
            }
        } catch(err) {
            console.error(`[BUG] - Skipped row index=${x}: ${err.message}`)
            continue
        }
    }

    if (strictXSchema) {
        validateStrictXRows({
            rows: X,
            sourceIndexes,
            strictFlagName: 'strictXSchema',
        });
    }

    if (strictYSchema) {
        validateStrictYRows({
            rows: Y,
            sourceIndexes,
            strictFlagName: 'strictYSchema',
        });
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

    const xKeys = xLen ? getComparableKeys(X[0]) : [];
    const yKeys = yLen ? getComparableKeys(Y[0]) : [];

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
    strictXSchema = true,
    state = {},
}) => {
    let X = [];
    let sourceIndexes = [];

    validateArray(arrObj, { min: 1 }, 'parseProductionX');
    validateFirstRow(arrObj[0]);

    if(yCallbackFunc != null) {
        throw new Error('The property "yCallbackFunc" must not be set in "parseProductionX".')
    }

    for (let x = 0; x < arrObj.length; x++) {

        try {
            if (!validateRows({ objRow: arrObj, index: x, state })) continue;

            const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state });

            if (typeof parsedX !== 'undefined' && parsedX !== null && parsedX !== false) {
                X.push(parsedX);
                sourceIndexes.push(x);
            }
        }  catch(err) {
            console.error(`[BUG] - Skipped row index=${x}: ${err.message}`)
            continue
        }
    }

    if (strictXSchema) {
        validateStrictXRows({
            rows: X,
            sourceIndexes,
            strictFlagName: 'strictXSchema',
        });
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
    const xKeys = xLen ? getComparableKeys(X[0]) : [];
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