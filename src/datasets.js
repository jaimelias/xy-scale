import { scaleArrayObj } from "./scale.js";
import { arrayToTimesteps } from "./timeSteps.js";


export const parseTrainingXY = ({ arrObj, trainingSplit = 0.8, weights = {}, yCallbackFunc, xCallbackFunc, forceScaling, timeSteps = 0 }) => {
    const X = [];
    const Y = [];

    //if parsedX and parsedY is undefined or null the current row will be excluded from training or production
    for (let x = 0; x < arrObj.length; x++) {
        const parsedX = xCallbackFunc({ objRow: arrObj, index: x });
        const parsedY = yCallbackFunc({ objRow: arrObj, index: x });
    
        if (parsedX !== undefined && parsedX !== null && parsedY !== undefined && parsedY !== null) {
            X.push(parsedX);
            Y.push(parsedY);
        }
    }

    // Scale X and Y, if applicable
    const {
        scaledOutput: scaledX, 
        scaledConfig: configX, 
        scaledKeyNames: keyNamesX

    } = scaleArrayObj({arrObj: X, weights, forceScaling})

    const {
        scaledOutput: scaledY,
        scaledConfig: configY,
        scaledKeyNames: keyNamesY
    } = scaleArrayObj({arrObj: Y, weights, forceScaling})

    const splitIndex = Math.floor(scaledX.length * trainingSplit)

    // Split into training and testing sets
    return {
        trainX: arrayToTimesteps(scaledX.slice(0, splitIndex), timeSteps),
        trainY: arrayToTimesteps(scaledY.slice(0, splitIndex), timeSteps),
        testX: arrayToTimesteps(scaledX.slice(splitIndex), timeSteps),
        testY: arrayToTimesteps(scaledY.slice(splitIndex), timeSteps),

        configX,
        keyNamesX,
        configY,
        keyNamesY
    };
};


export const parseProductionX = ({ arrObj, weights = {}, xCallbackFunc, forceScaling, timeSteps = 0 }) => {
    const X = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedX = xCallbackFunc({ objRow: arrObj, index: x })

        if (parsedX) {
            X.push(parsedX)
        }
    }

    // Scale X and Y, if applicable
    // Scale X and Y, if applicable
    const {
        scaledOutput: scaledX, 
        scaledConfig: configX, 
        scaledKeyNames: keyNamesX

    } = scaleArrayObj({arrObj: X, weights, forceScaling})


    // Split into training and testing sets
    return {
        X: arrayToTimesteps(scaledX, timeSteps),
        configX,
        keyNamesX
    }
};