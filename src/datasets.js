import { scaleArrayObj } from "./scale.js";
import { arrayShuffle, xyArrayShuffle } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";

export const parseTrainingXY = ({ 
    arrObj = [], 
    trainingSplit = 0.8, 
    repeat = {}, 
    yCallbackFunc = row => row, 
    xCallbackFunc = row => row,
    validateRows = () => true,
    groups = {},
    shuffle = false,
    minmaxRange = [],
    balancing = '',
    state = {},
    customMinMaxRanges = {},
    excludes = []
}) => {
    let X = [];
    let Y = [];

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

    let {
        scaledOutput: scaledY,
        scaledConfig: configY,
    } = scaleArrayObj({arrObj: Y, repeat, groups, minmaxRange, customMinMaxRanges, excludes: excludesSet})





    const splitIndex = Math.floor(scaledX.length * trainingSplit)

    let trainX = scaledX.slice(0, splitIndex)
    let trainY = scaledY.slice(0, splitIndex)
    let testX = scaledX.slice(splitIndex)
    let testY = scaledY.slice(splitIndex)


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
    minmaxRange = [],
    state = {},
    customMinMaxRanges,
    excludes = []
}) => {
    let X = [];

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