
export const isNumber = v => v != null && Number.isFinite(v)

export const isKeyPairObject = param => {
  return (
    param !== null &&
    typeof param === "object" &&
    !Array.isArray(param) &&
    Object.keys(param).length > 0
  );
}

export const validateArray = (arr, {min = -Infinity, max = Infinity}, paramName) => {

    if(!Array.isArray(arr))
    {
        throw new Error(`Invalid property. "${paramName}" expected an array.`)
    }

    if(arr.length < min)
    {
        throw new Error(`Invalid property value. Array "${paramName}" expected at least ${min} items.`)
    }
    if(arr.length > max)
    {
        throw new Error(`Invalid property value. Array "${paramName}" expected at max ${max} items.`)
    }

    return true
}

export const validateFirstRow = row => {

    if(!isKeyPairObject(row)) {
        throw new Error(`The first item in arrObj is expeted to be a key par object.`)
    }

    const numeric = {}
    const nonNumeric = {}

    for(const [k, v] of Object.entries(row))
    {
      if (typeof v === 'number') {
        numeric[k] = v
      }
      else {
        nonNumeric[k] = v
      }
    }

    if (Object.keys(numeric).length > 0 && hasInvalidNumbers(numeric, 'validateFirstRow')) {
        throw new Error(`Invalid numeric value at index 0.`)
    }
    if (Object.keys(nonNumeric).length > 0 && hasNullOrUndefined(nonNumeric, 'validateFirstRow')) {
        throw new Error(`Invalid non-numeric value at index 0.`)
    }
    
    return true
}

export const hasInvalidNumbers = (list, callerName) => {
    if (callerName == null) {
        throw new Error('[hasInvalidNumbers] Missing required param "callerName".')
    }

    if (!isKeyPairObject(list)) {
        throw new Error(`[${callerName}:hasInvalidNumbers] Received an invalid "list" param — expected a non-empty key-pair object, got: ${JSON.stringify(list)}.`)
    }

    for (const [k, v] of Object.entries(list)) {
        if(!isNumber(v)) {
            console.error(`[${callerName}:hasInvalidNumbers] property "${k}" only accept numbers. Invalid value is "${v}" and invalid type is "${typeof v}".`)
            return true
        }
    }

    return false
}

export const hasNullOrUndefined = (list, callerName) => {
    if (callerName == null) {
        throw new Error('[hasNullOrUndefined] Missing required param "callerName".')
    }

    if (!isKeyPairObject(list)) {
        throw new Error(`[${callerName}:hasNullOrUndefined] Received an invalid "list" param — expected a non-empty key-pair object, got: ${JSON.stringify(list)}.`)
    }

    for (const [k, v] of Object.entries(list)) {

        if(isKeyPairObject(v)) {
            for(const [k2, v2] of Object.entries(v)) {
                if(v2 == null) {
                    console.error(`[${callerName}:hasNullOrUndefined] Null or undefined value detected for key "${k}.${k2}".\n${String(v2)}`)
                    return true
                }
            }
        }
        else if (v == null) {
            console.error(`[${callerName}:hasNullOrUndefined] Null or undefined value detected for key "${k}".\n${String(v)}`)
            return true
        }
    }

    return false
}

export const arraysAreNotEqualSize = (list, callerName) => {
    if (callerName == null) {
        throw new Error('[arraysArentTheSameSize] Missing required param "callerName".')
    }

    if (!isKeyPairObject(list)) {
        throw new Error(`[${callerName}:arraysArentTheSameSize] Received an invalid "list" param — expected a non-empty key-pair object, got: ${JSON.stringify(list)}.`)
    }

    let preArr = null

    for (const [k, v] of Object.entries(list)) {
        if(!Array.isArray(v)) {
            console.error(`[${callerName}:arraysArentTheSameSize] Invalid array detected in key "${k}".\n${String(v)}`)
            return true
        }

        if(preArr === null) {
            preArr = v.length
        } else {
            if(preArr !== v.length) {
                return true
            }
        }
    }

    return false
}