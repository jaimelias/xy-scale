export const scaleArrayObj = ({arrObj, weights = {}, forceScaling = null}) => {

    if (forceScaling !== null && forceScaling !== 'normalization' && forceScaling !== 'standardization') {
        throw Error('forceScaling should be null, "normalization" or "standardization"');
    }

    const n = arrObj.length;

    if (n === 0) {
        return {
            scaledOutput: [],
            scaledConfig: {},
            keyNames: []
        };
    }

    const keyNames = Object.keys(arrObj[0]);

    const keyNameWeights = keyNames.map(key => {
        return weights.hasOwnProperty(key) ? Math.max(weights[key], 1) : 1;
    });

    const totalColumns = keyNameWeights.reduce((sum, weight) => sum + weight, 0);

    const outputKeyNames = new Array(totalColumns);
    let idx = 0;
    for (let i = 0; i < keyNames.length; i++) {
        for (let w = 0; w < keyNameWeights[i]; w++) {
            outputKeyNames[idx++] = keyNames[i];
        }
    }

    const inputTypes = {};
    const min = {};
    const max = {};
    const mean = {};
    const M2 = {};
    const approach = {};
    const uniqueStringIndexes = {};
    const counts = {};

    for (const key of keyNames) {
        const firstValue = arrObj[0][key];
        inputTypes[key] = typeof firstValue;

        if (inputTypes[key] === 'string') {
            uniqueStringIndexes[key] = {};
        }

        min[key] = Infinity;
        max[key] = -Infinity;
        mean[key] = 0;
        M2[key] = 0;
        counts[key] = 0;
    }

    for (const obj of arrObj) {
        for (const key of keyNames) {
            let value = obj[key];

            if (inputTypes[key] === 'string') {
                const uniqueIndexes = uniqueStringIndexes[key];
                if (!uniqueIndexes.hasOwnProperty(value)) {
                    uniqueIndexes[value] = Object.keys(uniqueIndexes).length;
                }
                value = uniqueIndexes[value];
                obj[key] = value;
            }

            min[key] = Math.min(min[key], value);
            max[key] = Math.max(max[key], value);

            counts[key]++;
            const delta = value - mean[key];
            mean[key] += delta / counts[key];
            M2[key] += delta * (value - mean[key]);
        }
    }

    const std = {};
    for (const key of keyNames) {
        std[key] = counts[key] > 1 ? Math.sqrt(M2[key] / (counts[key] - 1)) : 0;

        if (forceScaling === 'normalization' || forceScaling === 'standardization') {
            approach[key] = forceScaling;
        } else if (min[key] === 0 && max[key] === 1) {
            approach[key] = 'none';  // No scaling required
        } else {
            approach[key] = std[key] < 1 ? 'normalization' : 'standardization';
        }
    }

    const scaledOutput = new Array(n);
    for (let i = 0; i < n; i++) {
        const obj = arrObj[i];
        const scaledRow = new Array(totalColumns);
        let idx = 0;
        for (let j = 0; j < keyNames.length; j++) {
            const key = keyNames[j];
            const value = obj[key];
            const minValue = min[key];
            const maxValue = max[key];
            const meanValue = mean[key];
            const stdValue = std[key];

            let scaledValue;
            if (approach[key] === 'none') {
                scaledValue = value;  // No scaling
            } else if (approach[key] === 'normalization') {
                scaledValue = maxValue !== minValue ? (value - minValue) / (maxValue - minValue) : 0;
            } else {
                scaledValue = stdValue !== 0 ? (value - meanValue) / stdValue : 0;
            }

            const weight = keyNameWeights[j];
            for (let w = 0; w < weight; w++) {
                scaledRow[idx++] = scaledValue;
            }
        }
        scaledOutput[i] = scaledRow;
    }

    const scaledConfig = { min, max, std, mean, approach, inputTypes, uniqueStringIndexes };

    return {
        scaledOutput,
        scaledConfig,
        scaledKeyNames: outputKeyNames
    };
};
