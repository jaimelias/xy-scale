import OHLCV_INDICATORS from 'ohlcv-indicators'
import KNN from 'ml-knn'
import { ConfusionMatrix } from 'ml-confusion-matrix';

import { parseTrainingXY } from "../src/datasets.js"
import {arrayToTimesteps} from '../src/timeSteps.js'
import { loadFile } from "./fs.js"
import * as tf from '@tensorflow/tfjs-node'

const test = async () => {

    const ohlcv = (await loadFile({fileName: 'btc-1d.json', pathName: 'datasets'}))

    const indicators = new OHLCV_INDICATORS({input: ohlcv, ticker: 'BTC', precision: false})

    indicators
        .rsi(14)
        .bollingerBands(20, 2)
        .ema(50)
        .sma(200)
        .sma(300)
        .scaler(200, ['open', 'high', 'low', 'close'], {group: true})
        .crossPairs([
            {fast: 'rsi_14', slow: 30},
            {fast: 'price', slow: 'sma_200'},
            {fast: 'price', slow: 'sma_300'},
            {fast: 'price', slow: 'bollinger_bands_upper'}
        ])

    const parsedOhlcv = indicators.getData({dateFormat: 'milliseconds'})

    //console.log(parsedOhlcv.slice(-1))

    const {scaledGroups} = indicators

    const {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    } = parseTrainingXY({
        arrObj: parsedOhlcv,
        trainingSplit: 0.50,
        yCallbackFunc,
        xCallbackFunc,
        validateRows: ({objRow, index}) => {
            const curr = objRow[index]
            const prev = objRow[index - 1]

            if(typeof prev === 'undefined') return false

            return curr.ema_50 > curr.sma_300 && curr.sma_200 > curr.sma_300 && (curr.price_x_sma_300 === -1 || curr.price_x_sma_300 === 1)
        },
        shuffle: true,
        minmaxRange: [0, 1],
        balancing: null,
        groups: scaledGroups,
        excludes: ['high']
    });

    console.log(configX.outputKeyNames)
    console.log(configX.inputTypes)
    //console.log(configX)

    console.log('trainX', [trainX[0], trainX.at(-1)])



/* 
    tensorflowExample({
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    })

    classifiersExample({
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    })
 */
 
}

const classifiersExample = ({
    trainX,
    trainY,
    testX,
    testY,
    configX,
    keyNamesX,
}) => {
    const model = new KNN(trainX, trainY)

    const predictions = model.predict(testX)
    const compare = ConfusionMatrix.fromLabels(testY.flat(), predictions.flat())

    //console.log(testY.flat(), predictions.flat())

    console.log(compare.getAccuracy())
}

const tensorflowExample = ({
    trainX,
    trainY,
    testX,
    testY,
    configX,
    keyNamesX,
}) => {

    const timeSteps = 10
    const colsX = trainX[0].length
    const colsY = trainY[0].length
    const timeSteppedTrainX = arrayToTimesteps(trainX, timeSteps)
    const trimedTrainY = trainY.slice(timeSteps-1)

    const inputX = tf.tensor3d(timeSteppedTrainX, [timeSteppedTrainX.length, timeSteps, colsX])
    const targetY = tf.tensor2d(trimedTrainY,  [trimedTrainY.length, colsY])

    //console.log('trainX', trainX)
    //console.log('configX', configX)
    //console.log('inputX', inputX)
    //console.log('inputX', targetY)   

}

//callback function used to prepare X before scaling
const xCallbackFunc = ({ objRow, index }) => {
    const curr = objRow[index]
    const prev = objRow[index - 1]

    //returning null or undefined will exclude current row X and Y from training
    if(typeof prev === 'undefined') return null

    //console.log(((curr.sma_300 - curr.low) / curr.low) * 100)

    const output = {
        high: curr.high,
        ema50IsUp: curr.ema_50 > prev.ema_50,
        ema50GtSma200: curr.ema_50 > curr.sma_200,
        ema50GtSma300: curr.ema_50 > curr.sma_300,
        sma200IsUp: curr.sma_200 > prev.sma_200,
        sma200GtSma300: curr.sma_200 > prev.sma_300,
        sma_300IsUp: curr.sma_300 > prev.sma_300,
        rsi_14: curr.rsi_14,
        rsi_sma_14: curr.rsi_sma_14,
    }

    for(const [key, value]  of Object.entries(curr))
    {
        if(key.includes('minmax'))
        {
            output[key] = value
        }
    }

    return output
}

//callback function used to prepare Y before scaling
const yCallbackFunc = ({ objRow, index }) => {
    const curr = objRow[index]
    const next = new Array(60).fill(0).map((_, i) => objRow[index + 1 + i])

    //returning null or undefined will exclude current row X and Y from training
    if (next.some(o => typeof o === 'undefined')) return null;

    const priceTp = curr.sma_300 * 1.3
    const entryPrice = curr.sma_300 * 0.96
    const tp = next.some(o => o.close > entryPrice && (o.high > priceTp))
    const sl = next.some(o => (o.low - entryPrice)/entryPrice < -0.10 && o.low < entryPrice)

    const highestHigh = Math.max(...next.map(o => o.high))
    const lowestLow = Math.min(...next.slice(0, 5).map(o => o.low))


    if(lowestLow > entryPrice) return null

    //console.log([curr.date, (lowestLow - entryPrice)/entryPrice])
    
    return {
        result: Number(tp === true && sl === false)
    }
}

test()