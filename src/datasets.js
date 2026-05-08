import { arrayShuffle } from "./utilities.js";
import { validateFirstRow, validateArray, hasInvalidNumbers, validateSizes } from "./validators.js";
import {zscore} from './zscore.js'

export const parseTrainingXY = ({
    arrObj = [],
    trainSize = null,
    testSize = null,
    yCallbackFunc = row => row,
    xCallbackFunc = row => row,
    validateRows = () => true,
    shuffle = false,
    state = {},
    showSource = false,
    scaling = null
}) => {
    validateArray(arrObj, { min: 2 }, 'parseTrainingXY');
    validateFirstRow(arrObj[0]);

    const arrObjSize = arrObj.length;
    
    validateSizes({arrObjSize, trainSize, testSize});

    if(![null, 'zscore'].includes(scaling)) {
        throw new Error(`Invalid "scaling" property. Accepting null or "zscore".`)
    }

    const totalSize = trainSize + testSize;
    let flatX = [];
    let flatY = [];
    let source = [];

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

            const xLen = keyNamesX.length;
            const yLen = keyNamesY.length;

            const rowX = new Array(xLen);
            const rowY = new Array(yLen);

            for (let i = 0; i < xLen; i++) {
                const key = keyNamesX[i];
                rowX[i] = parsedX[key];
            }

            for (let i = 0; i < yLen; i++) {
                const key = keyNamesY[i];
                const value = parsedY[key];

                rowY[i] = value;

                const labelKey = Array.isArray(value)
                    ? JSON.stringify(value)
                    : String(value);

                labelCounts[key][labelKey] = (labelCounts[key][labelKey] ?? 0) + 1;
            }

            flatX.push(rowX);
            flatY.push(rowY);

            if(showSource) {
                source.push(arrObj[x])
            }
            

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

            if(showSource) {
                merged[i].source = source[i]
            }
        }

        const shuffled = arrayShuffle(merged);

        flatX = new Array(shuffled.length);
        flatY = new Array(shuffled.length);

        if(showSource) {
            source = new Array(shuffled.length)
        }
        

        for (let i = 0; i < shuffled.length; i++) {
            flatX[i] = shuffled[i].x;
            flatY[i] = shuffled[i].y;

            if(showSource) {
                source[i] = shuffled[i].source;
            }
        }
    }

    const configX = {
        keyNames: keyNamesX ?? [],
    };

    const configY = {
        keyNames: keyNamesY ?? [],
        labelCounts,
    };

    const startSize = arrObjSize - totalSize

    flatX.splice(0, startSize) //keeps the last items
    flatY.splice(0, startSize) //keeps the last items

    let trainX = flatX.slice(0, trainSize);
    let trainY = flatY.slice(0, trainSize);
    
    let stats = null

    if(scaling === 'zscore') {
        let trainNormalized = zscore(trainX)
        stats = trainNormalized.stats
        trainX = trainNormalized.data
        trainNormalized = null
    }

    let testX = flatX.slice(-testSize);

    if(scaling === 'zscore') {
        testX = zscore(testX, stats).data
    }

    let testY = flatY.slice(-testSize);


    flatX = null
    flatY = null

    let trainSource
    let testSource

    if(showSource) {
        source.splice(0, startSize) //keeps the last items
        trainSource = source.slice(0, trainSize);
        testSource = source.slice(-testSize);
        source = null
    }

    return {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        configY,
        trainSource,
        testSource,
        stats
    }
};
export const parseProductionX = ({
    arrObj = [],
    xCallbackFunc = row => row,
    yCallbackFunc = null,
    validateRows = () => true,
    shuffle = false,
    state = {},
    showSource = false,
    scaling = null,
    stats
}) => {
    let flatX = [];
    let source = [];
    let keyNamesX = null;

    validateArray(arrObj, { min: 1 }, 'parseProductionX');
    validateFirstRow(arrObj[0]);

    if(![null, 'zscore'].includes(scaling)) {
        throw new Error(`Invalid "scaling" property. Accepting null or "zscore".`)
    }

    const arrObjSize = arrObj.length

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
                keyNamesX = Object.keys(parsedX);
            }

            const xLen = keyNamesX.length;
            const rowX = new Array(xLen);

            for (let i = 0; i < xLen; i++) {
                const key = keyNamesX[i];
                rowX[i] = parsedX[key];
            }

            flatX.push(rowX);

            if(showSource) {
                source.push(arrObj[x])
            }
            

        } catch(err) {
            throw new Error(`[BUG] - Skipped row index=${x}: ${err.message}`);
        }
    }

    if (shuffle) {
        const merged = new Array(flatX.length);

        for (let i = 0; i < flatX.length; i++) {
            merged[i] = {
                x: flatX[i]
            };

            if(showSource) {
                merged[i].source = source[i]
            }
        }

        const shuffled = arrayShuffle(merged);

        flatX = new Array(shuffled.length);

        if(showSource) {
            source = new Array(shuffled.length)
        }
        

        for (let i = 0; i < shuffled.length; i++) {
            flatX[i] = shuffled[i].x;

            if(showSource) {
                source[i] = shuffled[i].source
            }
        }
    }

    const configX = {
        keyNames: keyNamesX ?? [],
    };

    if(scaling === 'zscore') {
        flatX = zscore(flatX, stats).data
    }

    return {
        X: flatX,
        source,
        configX,
    };
};