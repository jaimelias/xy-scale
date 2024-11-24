import { parseTrainingXY } from "../src/datasets.js"
import {arrayToTimesteps} from '../src/timeSteps.js'
import { loadFile } from "./fs.js"
import * as tf from '@tensorflow/tfjs-node'

const test = async () => {

    const myArray = (await loadFile({fileName: '1d-spy.json', pathName: 'datasets'})) //file in /datasets/1d-spy.json
    
    //callback function used to prepare X before scaling
    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index]
        const prev = objRow[index - 1]

        //returning null or undefined will exclude current row X and Y from training
        if(typeof prev === 'undefined') return null

        const { open, high, low, close, volume } = curr

        return {
            open,
            high,
            low,
            close,
            change: open - prev.close,
            top: high - Math.max(open, close),
            bottom: low - Math.min(open, close),
            body: open-close,
        }
    }

    //callback function used to prepare Y before scaling
    const yCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const next = objRow[index + 1];

        //returning null or undefined will exclude current row X and Y from training
        if (typeof next === 'undefined') return null;

        return {
            label_1: next.open > curr.close,
            label_2: next.close > curr.close,
        };
    };
    
    const {
        trainX,
        trainY,
        testX,
        testY,
        configX,
        keyNamesX,
    } = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.90,
        yCallbackFunc,
        xCallbackFunc,
        groups: {
            ohlc: ['open', 'high', 'low', 'close']
        },
        shuffle: true,
        repeat: {
            close: 20
        },
        minmaxRange: [-1, 1]
    });


    //console.log('testX', testX.slice(-2))


    const timeSteps = 10
    const colsX = trainX[0].length
    const colsY = trainY[0].length
    const timeSteppedTrainX = arrayToTimesteps(trainX, timeSteps)
    const trimedTrainY = trainY.slice(timeSteps-1)


    //console.log([trainX.length, timeSteps, timeSteppedTrainX[0][0].length])

    const inputX = tf.tensor3d(timeSteppedTrainX, [timeSteppedTrainX.length, timeSteps, colsX])
    const targetY = tf.tensor2d(trimedTrainY,  [trimedTrainY.length, colsY])

    console.log('trainX', trainX[trainX.length - 1])
    console.log('configX', keyNamesX)
    console.log('inputX', inputX)
    console.log('inputX', targetY)
}

test()