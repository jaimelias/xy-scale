import { scaleArrayObj } from "./scale.js";
import { arrayShuffle, xyArrayShuffle } from "./utilities.js";

export const parseTrainingXY = ({ 
    arrObj, 
    trainingSplit = 0.8, 
    weights = {}, 
    yCallbackFunc, 
    xCallbackFunc, 
    groups,
    shuffle = false
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

    const {
        scaledOutput: scaledX, 
        scaledConfig: configX, 
        scaledKeyNames: keyNamesX

    } = scaleArrayObj({arrObj: X, weights, groups})

    const {
        scaledOutput: scaledY,
        scaledConfig: configY,
        scaledKeyNames: keyNamesY
    } = scaleArrayObj({arrObj: Y, weights, groups})

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
    weights = {}, 
    xCallbackFunc, 
    groups,
    shuffle = false
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

    } = scaleArrayObj({arrObj: X, weights, groups})


    // Split into training and testing sets
    return {
        X: scaledX,
        configX,
        keyNamesX
    }
};