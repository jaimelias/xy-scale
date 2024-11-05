import { scaleArrayObj } from "./scale.js";

export const parseTrainingXY = ({ arrObj, trainingSplit = 0.8, weights = {}, yCallbackFunc, xCallbackFunc, forceScaling }) => {
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
        trainX: scaledX.slice(0, splitIndex),
        trainY: scaledY.slice(0, splitIndex),
        testX: scaledX.slice(splitIndex),
        testY: scaledY.slice(splitIndex),

        trainXConfig,
        trainXKeyNames,
        trainYConfig,
        trainYKeyNames
    };
};


export const parseProductionX = ({ arrObj, weights = {}, xCallbackFunc, forceScaling }) => {
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
        x: scaledX,
        xConfig,
        xKeyNames
    }
};