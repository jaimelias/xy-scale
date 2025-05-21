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

    const firstRow = Object.entries(row)

    firstRow.forEach((k, v) => {
      if (typeof v === 'undefined' || v === null || Number.isNaN(v)) {
        throw new Error(`Invalid value at index ${k}: value is ${v}. Expected a defined, non-null, numeric value.`);
      }
    })

    return true
}