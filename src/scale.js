export const scaleArrayObj = ({ arrObj, repeat = {}, minmaxRange = [0, 1], groups = {}, customMinMaxRanges = null }) => {
    
    const arrObjClone = [...arrObj]
    const arrObjLen = arrObjClone.length;
    const firstRow = arrObjClone[0]
    const validCustomMinMaxRanges = typeof customMinMaxRanges === 'object' && customMinMaxRanges !== null

    if (arrObjLen === 0) {
        return {
            scaledOutput: [],
            scaledConfig: {}
        };
    }
    
    const inputKeyNames = Object.keys(firstRow);

    const repeatedKeyNames = inputKeyNames.map(key => {
        return repeat.hasOwnProperty(key) ? Math.max(repeat[key], 1) : 1;
    });

    const countRepeatedKeyNames = repeatedKeyNames.reduce((sum, rep) => sum + rep, 0);

    const config = {
        arrObjLen,
        rangeMin: minmaxRange[0], 
        rangeMax: minmaxRange[1],
        inputTypes: {},
        min: {},
        max: {},
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

    validateUniqueProperties(config.groups);

    const validInputTypes = ['number', 'boolean']

    for (const key of config.inputKeyNames) {

        const firstType = typeof firstRow[key]
        const thisGroup = findGroup(key, config.groups);


        if(!validInputTypes.includes(firstType))
        {
            throw new Error(`Invalid input type "${firstType}" provided for key "${key}". Only accepting `)
        }

        config.inputTypes[key] = firstType;
        
        if(validCustomMinMaxRanges && customMinMaxRanges.hasOwnProperty(key))
        {
            if (thisGroup)
            {
                config.groupMinMax[thisGroup] = customMinMaxRanges[key]
            }
            else
            {
                config.min[key] = customMinMaxRanges[key].min;
                config.max[key] = customMinMaxRanges[key].max;                   
            }
        }
        else {
            if (thisGroup) {
                config.groupMinMax[thisGroup] = { min: Infinity, max: -Infinity };
            } 
            else {
                config.min[key] = Infinity;
                config.max[key] = -Infinity;
            }
        }
    }

    for (const obj of arrObjClone) {
        for (const key of config.inputKeyNames) {
            let value = obj[key];

            if (config.inputTypes[key] === 'boolean') {
                obj[key] = Number(value);
            }

            const thisGroup = findGroup(key, config.groups);

            if(validCustomMinMaxRanges === false || (validCustomMinMaxRanges && !customMinMaxRanges.hasOwnProperty(key)))
            {
                if (thisGroup) {
                    config.groupMinMax[thisGroup].min = Math.min(config.groupMinMax[thisGroup].min, value);
                    config.groupMinMax[thisGroup].max = Math.max(config.groupMinMax[thisGroup].max, value);
                } else {
                    config.min[key] = Math.min(config.min[key], value);
                    config.max[key] = Math.max(config.max[key], value);
                }
            }

        }
    }

    const scaledOutput = new Array(arrObjLen);
    for (let i = 0; i < arrObjLen; i++) {
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

    if(!config) return false 

    const requiredKeys = [
        "rangeMin",
        "rangeMax",
        "inputTypes",
        "min",
        "max",
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
        throw new Error("inputKeyNames must be an array.");
    }
    if(!Array.isArray(outputKeyNames))
    {
        throw new Error("outputKeyNames must be an array.");
    }
    if(!Array.isArray(repeatedKeyNames))
    {
        throw new Error("repeatedKeyNames must be an array.");
    }

    return true;
}