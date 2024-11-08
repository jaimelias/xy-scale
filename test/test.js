import { parseTrainingXY, parseProductionX } from "../src/datasets.js";
import { descaleArrayObj } from "../src/descale.js";
import { loadFile } from "./fs.js";

const test = async () => {

    const timeSteps = 10
    const myArray = (await loadFile({fileName: '1d-spy.json', pathName: 'datasets'}))
    
    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const { open, high, low} = curr;
    
        //returning null or undefined will exclude current row X and Y from training
        return {
            open,
            high,
            low,
        };
    };
    
    const yCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const next = objRow[index + 1];
    
         //returning null or undefined will exclude current row X and Y from training
        if (typeof next === 'undefined') return null;
    
        return {
            label_1: next.open > curr.open,       // Label indicating if the next open price is higher than the current
            label_2: next.high > curr.high,       // Label indicating if the next high price is higher than the current
            label_3: next.low > curr.low,         // Label indicating if the next low price is higher than the current
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
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        yCallbackFunc,
        xCallbackFunc,
        forceScaling: null,
        timeSteps
    });

    //console.log(JSON.stringify(trainingData))

    console.log('testX', testX[0])
    const descaled = descaleArrayObj({scaled: testX, config: configX, keyNames: keyNamesX, timeSteps})

    //comparing descaled values with the last values of input myArray
    console.log(descaled.slice(-2)) //last 2 values of descaled
    console.log(myArray.slice(-3, -1).map(({ open, high, low }) => ({ open, high, low }))) //last 2 values of myArray -1 interval
}

test()