export const scaleArrayObj = ({ arrObj, repeat = {}, minmaxRange = [0, 1], groups = {}, prevConfig = null }) => {
    
    const arrObjClone = [...arrObj]
    const n = arrObjClone.length;
    const firstRow = arrObjClone[0]

    if (n === 0) {
        return {
            scaledOutput: [],
            scaledConfig: {}
        };
    }

    let config = {}

    const isValidPrevConfig = prevConfig && validateConfig(prevConfig)

    if(isValidPrevConfig)
    {

        validateCurrPrevConfig(prevConfig, {minmaxRange, repeat, groups, firstRow})
        config = {...prevConfig}
    }
    else
    {
        const inputKeyNames = Object.keys(firstRow);

        const repeatedKeyNames = inputKeyNames.map(key => {
            return repeat.hasOwnProperty(key) ? Math.max(repeat[key], 1) : 1;
        });
    
        const countRepeatedKeyNames = repeatedKeyNames.reduce((sum, rep) => sum + rep, 0);

        config = {
            rangeMin: minmaxRange[0], 
            rangeMax: minmaxRange[1],
            inputTypes: {},
            min: {},
            max: {},
            uniqueStrIdx: {},
            groupMinMax: {},
            repeat,
            groups,
            inputKeyNames,
            outputKeyNames: new Array(countRepeatedKeyNames),
            repeatedKeyNames,
        } 
            
        let keyNamesIdx = 0;

        for (let i = 0; i < config.inputKeyNames.length; i++) {
            for (let w = 0; w < config.repeatedKeyNames[i]; w++) {
                config.outputKeyNames[keyNamesIdx++] = config.inputKeyNames[i];
            }
        }

        validateConfig(config)

    }

    validateUniqueProperties(config.groups);

    for (const key of config.inputKeyNames) {

        const firstType = typeof firstRow[key]

        if(isValidPrevConfig)
        {
            if(!config.inputTypes.hasOwnProperty(key))
            {
                // If prevConfig is set, no new inputTypes can be introduced
                throw new Error(`Error: A new unknown inputType property "${key}" found.`)
            }
            if(config.inputTypes[key] !== firstType)
            {
                 //is prevConfig is set the types of "typeof firstRow[key]" and config.inputTypes[key] must be the same
                throw new Error(`Error: Current inputType of property "${key}" is not the same as in the prevConfig inputType.`)
            }

            continue;
        }

        config.inputTypes[key] = firstType;

        if (firstType === 'string') {
            config.uniqueStrIdx[key] = {};
        }

        const thisGroup = findGroup(key, config.groups);

        if (thisGroup) {
            config.groupMinMax[thisGroup] = { min: Infinity, max: -Infinity };
        } else
        {
            config.min[key] = Infinity;
            config.max[key] = -Infinity;
        }
    }

    for (const obj of arrObjClone) {
        for (const key of config.inputKeyNames) {
            let value = obj[key];

            if (config.inputTypes[key] === 'string') {
                const uniqueIndexes = config.uniqueStrIdx[key];
                if (!uniqueIndexes.hasOwnProperty(value)) {
                    uniqueIndexes[value] = Object.keys(uniqueIndexes).length;
                }
                value = uniqueIndexes[value];
                obj[key] = value;
            } else if (config.inputTypes[key] === 'boolean') {
                obj[key] = Number(value);
            }

            const thisGroup = findGroup(key, config.groups);

            if (thisGroup) {
                config.groupMinMax[thisGroup].min = Math.min(config.groupMinMax[thisGroup].min, value);
                config.groupMinMax[thisGroup].max = Math.max(config.groupMinMax[thisGroup].max, value);
            } else {
                config.min[key] = Math.min(config.min[key], value);
                config.max[key] = Math.max(config.max[key], value);
            }
        }
    }

    const scaledOutput = new Array(n);
    for (let i = 0; i < n; i++) {
        const obj = arrObjClone[i];
        const scaledRow = new Array(config.outputKeyNames.length);
        let idx = 0;

        for (let j = 0; j < config.inputKeyNames.length; j++) {
            const key = config.inputKeyNames[j];
            const value = obj[key];

            const thisGroup = findGroup(key, config.groups);
            let minValue, maxValue;

            if (thisGroup) {
                minValue = config.groupMinMax[thisGroup].min;
                maxValue = config.groupMinMax[thisGroup].max;
            } else {
                minValue = config.min[key];
                maxValue = config.max[key];
            }

            const scaledValue =
                maxValue !== minValue
                    ? config.rangeMin + ((value - minValue) / (maxValue - minValue)) * (config.rangeMax - config.rangeMin)
                    : config.rangeMin;

            const rep = config.repeatedKeyNames[j];

            for (let w = 0; w < rep; w++) {
                scaledRow[idx++] = scaledValue;
            }
            
        }
        scaledOutput[i] = scaledRow;
    }

    

    return {
        scaledOutput,
        scaledConfig: config
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


const validateConfig = config => {

    const requiredKeys = [
        "rangeMin",
        "rangeMax",
        "inputTypes",
        "min",
        "max",
        "uniqueStrIdx",
        "groupMinMax",
        "repeat",
        "groups",
        "inputKeyNames",
        "outputKeyNames",
        "repeatedKeyNames"
    ];

    // Check for missing keys
    for (const key of requiredKeys) {
        if (!config.hasOwnProperty(key)) {
            throw new Error(`Missing key "${key}" in config.`);
        }
    }

    const { 
        rangeMin, 
        rangeMax, 
        inputTypes, 
        min, 
        max, 
        uniqueStrIdx, 
        groupMinMax, 
        repeat, 
        groups,
        inputKeyNames,
        outputKeyNames,
        repeatedKeyNames
    } = config;

    // Validate rangeMin and rangeMax are numbers and in proper order
    if (typeof rangeMin !== 'number' || typeof rangeMax !== 'number') {
        throw new Error("rangeMin and rangeMax must be numbers.");
    }
    if (rangeMin >= rangeMax) {
        throw new Error("rangeMin must be less than rangeMax.");
    }

    // Helper to check if a value is a plain object (and not null or an array)
    const isPlainObject = (obj) => typeof obj === 'object' && obj !== null && !Array.isArray(obj);

    if (!isPlainObject(inputTypes)) {
        throw new Error("inputTypes must be an object.");
    }
    if (!isPlainObject(min)) {
        throw new Error("min must be an object.");
    }
    if (!isPlainObject(max)) {
        throw new Error("max must be an object.");
    }
    if (!isPlainObject(uniqueStrIdx)) {
        throw new Error("uniqueStrIdx must be an object.");
    }
    if (!isPlainObject(groupMinMax)) {
        throw new Error("groupMinMax must be an object.");
    }
    if (!isPlainObject(repeat)) {
        throw new Error("repeat must be an object.");
    }
    if (!isPlainObject(groups)) {
        throw new Error("groups must be an object.");
    }
    if(!Array.isArray(inputKeyNames))
    {
        throw new Error("inputKeyNames must be an object.");
    }
    if(!Array.isArray(outputKeyNames))
    {
        throw new Error("outputKeyNames must be an object.");
    }
    if(!Array.isArray(repeatedKeyNames))
    {
        throw new Error("repeatedKeyNames must be an object.");
    }

    return true;
}

const validateCurrPrevConfig = (prevConfig, {minmaxRange, repeat, groups, firstRow}) => {

    if(prevConfig.rangeMin !== minmaxRange[0] || prevConfig.rangeMax !== minmaxRange[1])
    {
        throw new Error(`"prevConfig.minmaxRange" is not equal "minmaxRange".`);
    }

    //it is important o keep the same key order
    if (JSON.stringify(prevConfig.inputKeyNames) !== JSON.stringify(Object.keys(firstRow))) {
        throw new Error(`"prevConfig.inputKeyNames" structure does not match "Object.keys(firstRow)" structure. The order of keys is important.`);
    }

    if (JSON.stringify(prevConfig.repeat) !== JSON.stringify(repeat)) {
        throw new Error(`"prevConfig.repeat" structure does not match "repeat" structure. The order of keys is important.`);
    }

    if (JSON.stringify(prevConfig.groups) !== JSON.stringify(groups)) {
        throw new Error(`"prevConfig.groups" structure does not match "groups" structure. The order of keys is important.`);
    }

    return true
}