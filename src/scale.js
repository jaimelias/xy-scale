export const scaleArrayObj = ({ arrObj, repeat = {}, minmaxRange, groups = {}, customMinMaxRanges = {}, excludes = new Set() }) => {
    
    /*
        1. excluded items can be repeated
        2. excluded items can not be grouped
        3. excluded items can not be in customMixMaxRanges
        4. customMixMaxRanges items can not be grouped
        6. customMixMaxRanges items can not be excluded
        5. customMixMaxRanges can be repeated
        7. hierarchy order: 1 excluded items,  2 customMixMaxRanges items , 3 grouped items, 4 any other item
        6. customMixMaxRanges min and max must not be updated from values
    */

    const arrObjClone = arrObj.map(row => ({ ...row })) //[...arrObj] modified june 2
    const arrObjLen = arrObjClone.length;
    const firstRow = arrObjClone[0]
    const inputKeyNames = Object.keys(firstRow);

    const groupSets = {}

    for(const [k, g] of Object.entries(groups))
    {
        groupSets[k] = new Set(g)
    }

    validateUniqueProperties({excludes, groupSets, customMinMaxRanges, inputKeyNames, repeat})

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
        groupSets,
        inputKeyNames,
        outputKeyNames: new Array(countRepeatedKeyNames),
        repeatedKeyNames
    }
        
    let keyNamesIdx = 0;

    for (let i = 0; i < config.inputKeyNames.length; i++) {
        for (let w = 0; w < config.repeatedKeyNames[i]; w++) {
            config.outputKeyNames[keyNamesIdx++] = config.inputKeyNames[i];
        }
    }

    const validInputTypes = ['number', 'boolean']

    for (const key of config.inputKeyNames) {

        if(excludes.has(key))
        {
            config.inputTypes[key] = 'excluded'
            continue
        }

        const firstType = typeof firstRow[key]
        const thisGroup = findGroup(key, config.groupSets);


        if(!validInputTypes.includes(firstType))
        {
            throw new Error(`Invalid input type "${firstType}" provided for key "${key}". Only accepting ${JSON.stringify(validInputTypes)}`)
        }

        config.inputTypes[key] = firstType;
        
        //customMinMaxRanges can not be grouped
        if(customMinMaxRanges.hasOwnProperty(key))
        {
            config.min[key] = customMinMaxRanges[key].min;
            config.max[key] = customMinMaxRanges[key].max;
        }
        else if(thisGroup && !config.groupMinMax.hasOwnProperty(thisGroup)){
            config.groupMinMax[thisGroup] = { min: Infinity, max: -Infinity };
        }
        else {
            config.min[key] = Infinity;
            config.max[key] = -Infinity;
        }
    }

    for (const obj of arrObjClone) {
        for (const key of config.inputKeyNames) {

            if (config.inputTypes[key] === 'excluded')
            {
                continue;
            }

            let value = obj[key];

            if (config.inputTypes[key] === 'boolean') {
                obj[key] = Number(value);
                value = obj[key]
            }

            const thisGroup = findGroup(key, config.groupSets)

            if(!customMinMaxRanges.hasOwnProperty(key))
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
            const key = config.inputKeyNames[j]
            const value = obj[key]
            let scaledValue

            if (config.inputTypes[key] === 'excluded')
            {
                scaledValue = value
            }
            else
            {
                const thisGroup = findGroup(key, config.groupSets);
                let minValue, maxValue

                if (thisGroup) {
                    minValue = config.groupMinMax[thisGroup].min
                    maxValue = config.groupMinMax[thisGroup].max
                } else {
                    minValue = config.min[key]
                    maxValue = config.max[key]
                }

                scaledValue =
                    maxValue !== minValue
                        ? config.rangeMin + ((value - minValue) / (maxValue - minValue)) * (config.rangeMax - config.rangeMin)
                        : config.rangeMin;
            }


            const rep = config.repeatedKeyNames[j]

            for (let w = 0; w < rep; w++) {
                scaledRow[idx++] = scaledValue
            }
            
        }
        scaledOutput[i] = scaledRow
    }

    

    return {
        scaledOutput,
        scaledConfig: config
    }
}


const validateUniqueProperties = ({
  excludes,
  groupSets,
  customMinMaxRanges,
  repeat,
  inputKeyNames
}) => {
  // 0. Ensure every 'repeat' key actually exists in inputKeyNames
  for (const key of Object.keys(repeat)) {
    if (!inputKeyNames.includes(key)) {
      throw new Error(`"repeat" references missing key "${key}".`);
    }
  }

  // 1. Ensure every excluded key actually exists in inputKeyNames
  for (const key of excludes) {
    if (!inputKeyNames.includes(key)) {
      throw new Error(`Excluded property "${key}" does not exist in inputKeyNames.`);
    }
  }

  // 2. Ensure every customMinMaxRanges key exists in inputKeyNames
  for (const key of Object.keys(customMinMaxRanges)) {
    if (!inputKeyNames.includes(key)) {
      throw new Error(`customMinMaxRanges property "${key}" does not exist in inputKeyNames.`);
    }
  }

  // 3. Ensure every group member exists in inputKeyNames, and detect if a key appears in more than one group
  const seenInGroup = new Set();
  for (const [groupName, members] of Object.entries(groupSets)) {
    for (const key of members) {
      if (!inputKeyNames.includes(key)) {
        throw new Error(`Group "${groupName}" references missing key "${key}".`);
      }
      if (seenInGroup.has(key)) {
        throw new Error(`Property "${key}" appears in more than one group.`);
      }
      seenInGroup.add(key);
    }
  }

  // 4a. A key cannot be both in excludes and in customMinMaxRanges
  for (const key of excludes) {
    if (customMinMaxRanges.hasOwnProperty(key)) {
      throw new Error(`Property "${key}" is in both "excludes" and "customMinMaxRanges".`);
    }
  }

  // 4b. A key in excludes cannot be grouped
  for (const key of excludes) {
    if (findGroup(key, groupSets)) {
      throw new Error(`Property "${key}" is in "excludes" and also appears in a group.`);
    }
  }

  // 4c. A key in customMinMaxRanges cannot be grouped
  for (const key of Object.keys(customMinMaxRanges)) {
    if (findGroup(key, groupSets)) {
      throw new Error(
        `Property "${key}" is in "customMinMaxRanges" and also appears in a group.`
      );
    }
  }

  // 5. Ensure customMinMaxRanges[key].min <= customMinMaxRanges[key].max
  for (const [key, { min, max }] of Object.entries(customMinMaxRanges)) {
    if (min > max) {
      throw new Error(
        `customMinMaxRanges["${key}"].min (${min}) > max (${max}).`
      );
    }
  }
};



const findGroup = (key, groupSets) => {
    for (const [groupK, groupV] of Object.entries(groupSets)) {
        if (groupV.has(key)) {
            return groupK;
        }
    }
    return null;
};