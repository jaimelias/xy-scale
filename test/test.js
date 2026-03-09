import OHLCV_INDICATORS from 'ohlcv-indicators'
import { parseTrainingXY } from "../src/datasets.js"
import { arrayToTimesteps } from '../src/timeSteps.js'
import { loadFile } from "./fs.js"

const test = async () => {

    const input = (await loadFile({fileName: 'btc-1d.json', pathName: 'datasets'}))

    const indicators = new OHLCV_INDICATORS({input, precision: false})

    const weights5 = {
      ret_gap: [2, 2, 1.75, 1.5],
      ret_change: [2, 2, 1.75, 1.5]
    }

    const weights3 = {
      ret_ema_5: [1.5, 1.5, 1.2],
      ret_sma_200: [1.5, 1.5, 1.2], 
      ret_atr_14_upper: [1.5, 1.5, 1.2], 
    }

    indicators
      .volumeDelta()
      .atr(14, {upper: 1})
      .ema(5)
      .sma(200)
      .priceFeatures({colKeys: ['ema_5', 'sma_200', 'atr_14_upper']})
      .scaler('zscore', 5, {group: true, lag: true, colKeys: ['ret_change', 'ret_upper_wick', 'ret_lower_wick', 'ret_gap', 'ret_body', 'ret_range'], weights: weights5})
      .scaler('zscore', 3, {group: true, lag: true, colKeys: ['ret_change', 'ret_ema_5', 'ret_sma_200', 'ret_atr_14_upper'], weights: weights3})

    const arrObj = indicators.getData()

    const {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        configY
    } = parseTrainingXY({
        arrObj,
        trainingSplit: 0.50,
        yCallbackFunc,
        xCallbackFunc,
        validateRows: ({objRow, index}) => {

            const curr = objRow[index]
            const prev = objRow[index - 1]

            if(typeof prev === 'undefined') return false //return false or null or undefined to continue to skip this row

            if(!Number.isNaN(curr.sma_200) && !Number.isNaN(prev.sma_200)  && curr.sma_200 > prev.sma_200) return true //return true to include this row in dataset

            return false
        },
        shuffle: false,
        balancing: null,
    });

    console.log(configX.keyNames)
    console.log('row_1', {features: trainX[0], labels: trainY[0]})

    console.log(trainY.length, trainX.length)
    console.log(configY)

    const timeSteps = arrayToTimesteps(trainX, 10)

    const typeArr = (a) => Array.isArray(a) ? 'array' : typeof a

    console.log(`timeSteps: ${typeArr(timeSteps)} => ${typeArr(timeSteps[0])} => ${typeArr(timeSteps[0][0][0])}`)
}

//callback function used to prepare X before flattening
const xCallbackFunc = ({ objRow, index }) => {
    const curr = objRow[index]

    const output = {}

    for(const [k, v] of Object.entries(curr)) {
        if(k.startsWith('zscore_')) {
            output[k] = v
        }
    }

    return output //returning null or undefined will exclude current row X and Y from training
}

//callback function used to prepare Y before flattening
const yCallbackFunc = ({ objRow, index }) => {

    const curr = objRow[index]
    const next = objRow[index + 1]

    //returning null or undefined will exclude current row X and Y from training
    if (typeof next === 'undefined') return null
    
    return {
        label_1: Number(next.close > next.open),
        label_2: Number(next.close > curr.close)
    }
}

test()
