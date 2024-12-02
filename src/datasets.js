import { scaleArrayObj } from "./scale.js";
import { arrayShuffle, xyArrayShuffle } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";

export const parseTrainingXY = ({ 
    arrObj, 
    trainingSplit = 0.8, 
    repeat = {}, 
    yCallbackFunc, 
    xCallbackFunc, 
    groups,
    shuffle = false,
    minmaxRange,
    balancing = ''
}) => {
    let X = [];
    let Y = [];

    //if parsedX and parsedY is undefined or null the current row will be excluded from training or production
    for (let x = 0; x < arrObj.length; x++) {
        const parsedX = xCallbackFunc({ objRow: arrObj, index: x });
        const parsedY = yCallbackFunc({ objRow: arrObj, index: x });
    
        if (parsedX !== undefined && parsedX !== null && parsedY !== undefined && parsedY !== null) {
            X.push(parsedX);
            Y.push(parsedY);
        }
    }

    if(shuffle)
    {
        const {shuffledX, shuffledY} = xyArrayShuffle(X, Y)
        X = shuffledX
        Y = shuffledY
    }

    let {
        scaledOutput: scaledX, 
        scaledConfig: configX, 
        scaledKeyNames: keyNamesX

    } = scaleArrayObj({arrObj: X, repeat, groups, minmaxRange})

    let {
        scaledOutput: scaledY,
        scaledConfig: configY,
        scaledKeyNames: keyNamesY
    } = scaleArrayObj({arrObj: Y, repeat, groups, minmaxRange})


    if(balancing)
    {
        let balance

        if(balancing === 'oversample')
        {
            balance = oversampleXY(scaledX, scaledY)
            scaledX = balance.X
            scaledY = balance.Y
        }
        else if(balancing === 'undersample')
        {
            balance = undersampleXY(scaledX, scaledY)
            scaledX = balance.X
            scaledY = balance.Y           
        }
        else
        {
            throw Error('balancing argument only accepts "false", "oversample" and "undersample". Defaults to "false".')
        }
    }


    const splitIndex = Math.floor(scaledX.length * trainingSplit)

    // Split into training and testing sets
    return {
        trainX: scaledX.slice(0, splitIndex),
        trainY: scaledY.slice(0, splitIndex),
        testX: scaledX.slice(splitIndex),
        testY: scaledY.slice(splitIndex),

        configX,
        keyNamesX,
        configY,
        keyNamesY
    };
};


export const parseProductionX = ({ 
    arrObj, 
    repeat = {}, 
    xCallbackFunc, 
    groups,
    shuffle = false,
    minmaxRange
}) => {
    let X = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedX = xCallbackFunc({ objRow: arrObj, index: x })

        if (parsedX) {
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
        scaledConfig: configX, 
        scaledKeyNames: keyNamesX

    } = scaleArrayObj({arrObj: X, repeat, groups, minmaxRange})


    // Split into training and testing sets
    return {
        X: scaledX,
        configX,
        keyNamesX
    }
};