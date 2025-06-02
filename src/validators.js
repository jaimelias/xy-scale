export const validateExcludes = (row, excludes) => {

  const keyNames = Object.keys(row)

  if(!Array.isArray(excludes))
  {
    throw new Error(`Property "excludes" must be an array.`)
  }

  for(const k of excludes)
  {
    if(!keyNames.includes(k)) throw new Error(`An item in "excludes" property was not found in "arrObj".\n\nexcludes: ${JSON.stringify(excludes)}\n\narrObj: ${JSON.stringify(keyNames)}`)
  }

}

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
      if (typeof v === 'number' && Number.isNaN(v)) {
        throw new Error(`Invalid value at index 0 property "${k}": value is "${v}". Expected a numeric value.`);
      }
      if (v === null) {
        throw new Error(`Invalid value at index 0 property "${k}": value is "${v}".`);
      }
    }
    
    return true
}