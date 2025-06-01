export const validateArray = (arr, {min = -Infinity, max = Infinity}, paramName) => {

    if(!Array.isArray(arr))
    {
        throw new Error(`Invalid property. "${paramName}" expected an array.`)
    }

    if(arr.length < min)
    {
        throw new Error(`Invalid property value. Array "${paramName}" expected at least ${max} items.`)
    }
    if(arr.length > max)
    {
        throw new Error(`Invalid property value. Array "${paramName}" expected at max ${max} items.`)
    }

    return true
}

export const validateFirstRow = row => {

    for(const [k, v] of Object.entries(row))
    {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        throw new Error(`Invalid value at index 0 property "${k}": value is "${v}". Expected a numeric value.`);
      }
    }
    
    return true
}