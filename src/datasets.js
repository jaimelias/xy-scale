import { arrayShuffle, xyArrayShuffle } from "./utilities.js";
import { oversampleXY, undersampleXY } from "./balancing.js";
import { validateFirstRow, validateArray } from "./validators.js";

//ADD A PARAM max correlation that will measure the correlation between variables if defined

export const parseTrainingXY = ({ 
    arrObj = [], //array of objects
    trainingSplit = 0.8, //numberic float between 0.01 and 0.99
    yCallbackFunc = row => row, //accepted callback functions
    xCallbackFunc = row => row, //accepted callback functions
    validateRows = () => true,//accepted callback functions
    shuffle = false,//only booleans
    balancing = '',//accepted null, "oversample" or "undersample"
    state = {}, //accepted object or classes
}) => {
    let X = [];
    let Y = [];

    validateArray(arrObj, {min: 5}, 'parseTrainingXY')
    validateFirstRow(arrObj[0])

    //if parsedX and parsedY is undefined or null the current row will be excluded from training or production
    for (let x = 0; x < arrObj.length; x++) {

        if(!validateRows({ objRow: arrObj, index: x, state})) continue

        const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state})
        const parsedY = yCallbackFunc({ objRow: arrObj, index: x, state})
    
        if (typeof parsedX !== 'undefined' && parsedX !== null && typeof parsedY !== 'undefined' && parsedY !== null) {
            X.push(parsedX)
            Y.push(parsedY)
        }
    }

    if(shuffle)
    {
        const {shuffledX, shuffledY} = xyArrayShuffle(X, Y)
        X = shuffledX
        Y = shuffledY
    }

    const xLen = X.length
    const yLen = Y.length
    const flatX = new Array(xLen)
    const flatY = new Array(yLen)
    const configX = {
        keyNames: xLen ? Object.keys(X[0]) : []
    }
    const configY = {
        keyNames: yLen ? Object.keys(Y[0]) : []
    }

    for(let idx = 0; idx < xLen; idx++)
    {
        flatX[idx] = Object.values(X[idx])
    }

    for(let idx = 0; idx < yLen; idx++)
    {
        flatY[idx] = Object.values(Y[idx])
    }

    const splitIndex = Math.floor(flatX.length * trainingSplit)

    let trainX = flatX.slice(0, splitIndex)
    let trainY = flatY.slice(0, splitIndex)
    let testX = flatX.slice(splitIndex)
    let testY = flatY.slice(splitIndex)


    if(balancing)
    {
        let balance

        if(balancing === 'oversample')
        {
            balance = oversampleXY(trainX, trainY)
            trainX = balance.X
            trainY = balance.Y
        }
        else if(balancing === 'undersample')
        {
            balance = undersampleXY(trainX, trainY)
            trainX = balance.X
            trainY = balance.Y           
        }
        else
        {
            throw Error('balancing argument only accepts "false", "oversample" and "undersample". Defaults to "false".')
        }
    }


    // Split into training and testing sets
    return {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        configY,
    };
};


export const parseProductionX = ({ 
    arrObj = [], 
    xCallbackFunc = row => row,
    validateRows = () => true,
    shuffle = false,
    state = {},
}) => {
    let X = [];

    validateArray(arrObj, {min: 5}, 'parseProductionX')
    validateFirstRow(arrObj[0])

    for (let x = 0; x < arrObj.length; x++) {

        if(!validateRows(arrObj[x])) continue

        const parsedX = xCallbackFunc({ objRow: arrObj, index: x, state})

        if (typeof parsedX !== 'undefined' && parsedX !== null && parsedX !== false) {
            X.push(parsedX)
        }
    }

    if(shuffle)
    {
        X = arrayShuffle(X)
    }

    const xLen = X.length
    const flatX = new Array(xLen)
    const configX = {
        keyNames: xLen ? Object.keys(X[0]) : []
    }

    for(let idx = 0; idx < xLen; idx++)
    {
        flatX[idx] = Object.values(X[idx])
    }

    // Split into training and testing sets
    return {
        X: flatX,
        configX,
    }
};
