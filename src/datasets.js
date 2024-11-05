import { scaleArrayObj } from "./scale.js";

export const parseTrainingDataset = ({ arrObj, trainingSplit = 0.8, weights = {}, parseLabels, parseFeatures, forceScaling }) => {
    const features = [];
    const labels = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedFeatures = parseFeatures({ objRow: arrObj, index: x });
        const parsedLabels = parseLabels({ objRow: arrObj, index: x });

        if (parsedFeatures && parsedLabels) {
            features.push(parsedFeatures)
            labels.push(parsedLabels)
        }
    }

    // Scale features and labels, if applicable
    const {
        scaledOutput: scaledFeatures, 
        scaledConfig: trainFeaturesConfig, 
        scaledKeyNames: trainFeaturesKeyNames

    } = scaleArrayObj({arrObj: features, weights, forceScaling})

    const {
        scaledOutput: scaledLabels,
        scaledConfig: trainLabelsConfig,
        scaledKeyNames: trainLabelKeyNames
    } = scaleArrayObj({arrObj: labels, weights, forceScaling})

    const splitIndex = Math.floor(scaledFeatures.length * trainingSplit)

    // Split into training and testing sets
    return {
        trainFeatures: scaledFeatures.slice(0, splitIndex),
        trainLabels: scaledLabels.slice(0, splitIndex),
        testFeatures: scaledFeatures.slice(splitIndex),
        testLabels: scaledLabels.slice(splitIndex),

        trainFeaturesConfig,
        trainFeaturesKeyNames,
        trainLabelsConfig,
        trainLabelKeyNames
    };
};


export const parseProductionDataset = ({ arrObj, weights = {}, parseFeatures, forceScaling }) => {
    const features = [];

    for (let x = 0; x < arrObj.length; x++) {
        const parsedFeatures = parseFeatures({ objRow: arrObj, index: x })

        if (parsedFeatures) {
            features.push(parsedFeatures)
        }
    }

    // Scale features and labels, if applicable
    // Scale features and labels, if applicable
    const {
        scaledOutput: scaledFeatures, 
        scaledConfig: productionFeaturesConfig, 
        scaledKeyNames: productionFeaturesKeyNames

    } = scaleArrayObj({arrObj: features, weights, forceScaling})


    // Split into training and testing sets
    return {
        productionFeatures: scaledFeatures,
        productionFeaturesConfig,
        productionFeaturesKeyNames
    }
};