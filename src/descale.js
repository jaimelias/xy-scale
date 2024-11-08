import { timeStepsToArray } from './timeSteps.js';

export const descaleArrayObj = ({ scaled, config, keyNames, timeSteps = 0 }) => {


    

    const { min, max, std, mean, approach, inputTypes, uniqueStringIndexes } = config;


    console.log('timeStepsToArray', timeStepsToArray(scaled, timeSteps)[0])

    // Initialize the descaled output array
    const descaledOutput = timeStepsToArray(scaled, timeSteps).map(scaledRow => {
        const originalObj = {};
        let idx = 0;

        for (const key of Object.keys(min)) {
            // Determine the scaling approach for the current key
            const keyApproach = approach[key];
            const minValue = min[key];
            const maxValue = max[key];
            const meanValue = mean[key];
            const stdValue = std[key];

            // Get the weight for this key from the keyNames
            const keyWeight = keyNames.filter(k => k === key).length;

            // Reconstruct the original value from the scaled values
            let summedValue = 0;
            for (let w = 0; w < keyWeight; w++) {
                summedValue += scaledRow[idx++];
            }
            const avgScaledValue = summedValue / keyWeight;

            // Descale based on approach
            let descaledValue;
            if (keyApproach === 'normalization') {
                descaledValue = avgScaledValue * (maxValue - minValue) + minValue;
            } else if (keyApproach === 'standardization') {
                descaledValue = avgScaledValue * stdValue + meanValue;
            }

            // Handle string keys if necessary
            if (inputTypes[key] === 'string') {
                const reverseUniqueIndex = Object.keys(uniqueStringIndexes[key]).find(
                    k => uniqueStringIndexes[key][k] === descaledValue
                );
                descaledValue = reverseUniqueIndex !== undefined ? reverseUniqueIndex : descaledValue;
            }

            originalObj[key] = descaledValue;
        }

        return originalObj;
    });

    return descaledOutput;
};


