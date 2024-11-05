import { scaleArrayObj } from "./scale.js";

export const parseTrainingXY = ({ arrObj, trainingSplit = 0.8, weights = {}, yCallbackFunc, xCallbackFunc, forceScaling }) => {
    const features = [];
    const labels = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedFeatures = xCallbackFunc({ objRow: arrObj, index: x });
        const parsedLabels = yCallbackFunc({ objRow: arrObj, index: x });

        if (parsedFeatures && parsedLabels) {
            features.push(parsedFeatures)
            labels.push(parsedLabels)
        }
    }

    // Scale features and labels, if applicable
    const {
        scaledOutput: scaledFeatures, 
        scaledConfig: trainXConfig, 
        scaledKeyNames: trainXKeyNames

    } = scaleArrayObj({arrObj: features, weights, forceScaling})

    const {
        scaledOutput: scaledLabels,
        scaledConfig: trainYConfig,
        scaledKeyNames: trainYKeyNames
    } = scaleArrayObj({arrObj: labels, weights, forceScaling})

    const splitIndex = Math.floor(scaledFeatures.length * trainingSplit)

    // Split into training and testing sets
    return {
        trainX: scaledFeatures.slice(0, splitIndex),
        trainY: scaledLabels.slice(0, splitIndex),
        testX: scaledFeatures.slice(splitIndex),
        testY: scaledLabels.slice(splitIndex),

        trainXConfig,
        trainXKeyNames,
        trainYConfig,
        trainYKeyNames
    };
};


export const parseProductionX = ({ arrObj, weights = {}, xCallbackFunc, forceScaling }) => {
    const features = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedFeatures = xCallbackFunc({ objRow: arrObj, index: x })

        if (parsedFeatures) {
            features.push(parsedFeatures)
        }
    }

    // Scale features and labels, if applicable
    // Scale features and labels, if applicable
    const {
        scaledOutput: scaledFeatures, 
        scaledConfig: xConfig, 
        scaledKeyNames: xKeyNames

    } = scaleArrayObj({arrObj: features, weights, forceScaling})


    // Split into training and testing sets
    return {
        x: scaledFeatures,
        xConfig,
        xKeyNames
    }
};