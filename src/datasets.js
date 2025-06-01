import { scaleArrayObj } from "./scale.js";
import { arrayShuffle, xyArrayShuffle } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";
import { validateFirstRow, validateArray } from "./validators.js";
import { analizeCorrelation } from "./correlation.js";
import { correlation } from "ohlcv-indicators/src/studies/correlation.js";

//ADD A PARAM max correlation that will measure the correlation between variables if defined

export const parseTrainingXY = ({ 
    arrObj = [], //array of objects
    trainingSplit = 0.8, //numberic float between 0.01 and 0.99
    repeat = {}, //accepted key pair object with number as values
    yCallbackFunc = row => row, //accepted callback functions
    xCallbackFunc = row => row, //accepted callback functions
    validateRows = () => true,//accepted callback functions
    groups = {},//accepted object of arrays
    shuffle = false,//only booleans
    minmaxRange = [0, 1],
    balancing = '',//accepted null, "oversample" or "undersample"
    state = {}, //accepted object or classes
    customMinMaxRanges = {},
    excludes = [],//each item must be a string
    correlation = {}
}) => {
    let X = [];
    let Y = [];

    validateArray(arrObj, {min: 5}, 'parseTrainingXY')
    validateFirstRow(arrObj[0])

    const {corrSplit = 0.2, corrExcludes = [], corrThreshold = 0.95} = correlation

    analizeCorrelation({arrObj, corrSplit, corrExcludes: new Set(corrExcludes), corrThreshold})

    //if parsedX and parsedY is undefined or null the current row will be excluded from training or production
    for (let x = 0; x < arrObj.length; x++) {

        if(!validateRows({ objRow: arrObj, index: x, state})) continue

        const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state})
        const parsedY = yCallbackFunc({ objRow: arrObj, index: x, state})
    
        if (typeof parsedX !== 'undefined' && parsedX !== null && typeof parsedY !== 'undefined' && parsedY !== null) {
            X.push(parsedX)
            Y.push(parsedY)
        }
    }

    if(shuffle)
    {
        const {shuffledX, shuffledY} = xyArrayShuffle(X, Y)
        X = shuffledX
        Y = shuffledY
    }

    const excludesSet = new Set(excludes)

    let {
        scaledOutput: scaledX, 
        scaledConfig: configX
    } = scaleArrayObj({arrObj: X, repeat, groups, minmaxRange, customMinMaxRanges, excludes: excludesSet})


    const yLen = Y.length
    const flatY = new Array(yLen)
    const configY = {
        keyNames: Object.keys(Y[0])
    }

    for(let idx = 0; idx < yLen; idx++)
    {
        flatY[idx] = Object.values(Y[idx])
    }


    const splitIndex = Math.floor(scaledX.length * trainingSplit)

    let trainX = scaledX.slice(0, splitIndex)
    let trainY = flatY.slice(0, splitIndex)
    let testX = scaledX.slice(splitIndex)
    let testY = flatY.slice(splitIndex)


    if(balancing)
    {
        let balance

        if(balancing === 'oversample')
        {
            balance = oversampleXY(trainX, trainY)
            trainX = balance.X
            trainY = balance.Y
        }
        else if(balancing === 'undersample')
        {
            balance = undersampleXY(trainX, trainY)
            trainX = balance.X
            trainY = balance.Y           
        }
        else
        {
            throw Error('balancing argument only accepts "false", "oversample" and "undersample". Defaults to "false".')
        }
    }


    // Split into training and testing sets
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
    repeat = {}, 
    xCallbackFunc = row => row,
    validateRows = () => true,
    groups = {},
    shuffle = false,
    minmaxRange = [0, 1],
    state = {},
    customMinMaxRanges,
    excludes = []
}) => {
    let X = [];

    validateArray(arrObj, {min: 5}, 'parseProductionX')
    validateFirstRow(arrObj[0])

    for (let x = 0; x < arrObj.length; x++) {

        if(!validateRows(arrObj[x])) continue

        const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state})

        if (typeof parsedX !== 'undefined' && parsedX !== null && parsedX !== false) {
            X.push(parsedX)
        }
    }

    if(shuffle)
    {
        X = arrayShuffle(X)
    }


    // Scale X
    const {
        scaledOutput: scaledX, 
        scaledConfig: configX
    } = scaleArrayObj({arrObj: X, repeat, groups, minmaxRange, customMinMaxRanges, excludes: new Set(excludes)})


    // Split into training and testing sets
    return {
        X: scaledX,
        configX,
    }
};