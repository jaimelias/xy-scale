export const scaleArrayObj = ({ arrObj, weights = {}, minmaxRange = [0, 1], groups = {} }) => {
    const n = arrObj.length;

    validateUniqueProperties(groups);

    if (n === 0) {
        return {
            scaledOutput: [],
            scaledConfig: {},
            keyNames: []
        };
    }

    const [rangeMin, rangeMax] = minmaxRange;

    if (rangeMin >= rangeMax) {
        throw new Error('Invalid minmaxRange: rangeMin must be less than rangeMax');
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
    const uniqueStringIndexes = {};
    const groupMinMax = {};

    for (const key of keyNames) {
        const firstValue = arrObj[0][key];
        inputTypes[key] = typeof firstValue;

        if (inputTypes[key] === 'string') {
            uniqueStringIndexes[key] = {};
        }



        const thisGroup = findGroup(key, groups);
        if (thisGroup) {
            if (!groupMinMax[thisGroup]) {
                groupMinMax[thisGroup] = { min: Infinity, max: -Infinity };
            }
        } else
        {
            min[key] = Infinity;
            max[key] = -Infinity;
        }
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
            } else if (inputTypes[key] === 'boolean') {
                obj[key] = Number(value);
            }

            const thisGroup = findGroup(key, groups);

            if (thisGroup) {
                groupMinMax[thisGroup].min = Math.min(groupMinMax[thisGroup].min, value);
                groupMinMax[thisGroup].max = Math.max(groupMinMax[thisGroup].max, value);
            } else {
                min[key] = Math.min(min[key], value);
                max[key] = Math.max(max[key], value);
            }
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

            const thisGroup = findGroup(key, groups);
            let minValue, maxValue;

            if (thisGroup) {
                minValue = groupMinMax[thisGroup].min;
                maxValue = groupMinMax[thisGroup].max;
            } else {
                minValue = min[key];
                maxValue = max[key];
            }

            const scaledValue =
                maxValue !== minValue
                    ? rangeMin + ((value - minValue) / (maxValue - minValue)) * (rangeMax - rangeMin)
                    : rangeMin;

            const weight = keyNameWeights[j];
            for (let w = 0; w < weight; w++) {
                scaledRow[idx++] = scaledValue;
            }
        }
        scaledOutput[i] = scaledRow;
    }

    const scaledConfig = { min, max, inputTypes, uniqueStringIndexes, rangeMin, rangeMax, groupMinMax };

    return {
        scaledOutput,
        scaledConfig,
        scaledKeyNames: outputKeyNames
    };
};

const validateUniqueProperties = obj => {
    const uniqueValues = new Set();
    const allValues = [];

    for (const [key, arr] of Object.entries(obj)) {
        uniqueValues.add(key);
        allValues.push(key);

        arr.forEach(v => {
            uniqueValues.add(v);
            allValues.push(v);
        });
    }

    if (uniqueValues.size !== allValues.length) {
        throw new Error('Duplicate value found between properties in validateUniqueProperties function.');
    }
};

const findGroup = (key, groups) => {
    for (const [groupK, groupV] of Object.entries(groups)) {
        if (groupV.includes(key)) {
            return groupK;
        }
    }
    return null;
};
