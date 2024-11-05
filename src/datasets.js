import { scaleArrayObj } from "./scale.js";

const arrayToTimesteps = (arr, timeSteps) => {
    if (timeSteps === 0) return arr;
    if (timeSteps < 0) throw new Error("timeSteps must be greater than 0");
    
    const timestepsArray = [];
    
    for (let i = 0; i <= arr.length - timeSteps; i++) {
        timestepsArray.push(arr.slice(i, i + timeSteps));
    }
    
    return timestepsArray;
}



export const parseTrainingXY = ({ arrObj, trainingSplit = 0.8, weights = {}, yCallbackFunc, xCallbackFunc, forceScaling, timeSteps = 0 }) => {
    const X = [];
    const Y = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedX = xCallbackFunc({ objRow: arrObj, index: x });
        const parsedY = yCallbackFunc({ objRow: arrObj, index: x });

        if (parsedX && parsedY) {
            X.push(parsedX)
            Y.push(parsedY)
        }
    }

    // Scale X and Y, if applicable
    const {
        scaledOutput: scaledX, 
        scaledConfig: trainXConfig, 
        scaledKeyNames: trainXKeyNames

    } = scaleArrayObj({arrObj: X, weights, forceScaling})

    const {
        scaledOutput: scaledY,
        scaledConfig: trainYConfig,
        scaledKeyNames: trainYKeyNames
    } = scaleArrayObj({arrObj: Y, weights, forceScaling})

    const splitIndex = Math.floor(scaledX.length * trainingSplit)

    // Split into training and testing sets
    return {
        trainX: arrayToTimesteps(scaledX.slice(0, splitIndex), timeSteps),
        trainY: arrayToTimesteps(scaledY.slice(0, splitIndex), timeSteps),
        testX: arrayToTimesteps(scaledX.slice(splitIndex), timeSteps),
        testY: arrayToTimesteps(scaledY.slice(splitIndex), timeSteps),

        trainXConfig,
        trainXKeyNames,
        trainYConfig,
        trainYKeyNames
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
        scaledConfig: xConfig, 
        scaledKeyNames: xKeyNames

    } = scaleArrayObj({arrObj: X, weights, forceScaling})


    // Split into training and testing sets
    return {
        x: arrayToTimesteps(scaledX, timeSteps),
        xConfig,
        xKeyNames
    }
};