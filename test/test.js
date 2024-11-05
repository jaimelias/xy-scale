import { parseTrainingXY, parseProductionX } from "../src/datasets.js";


const test = () => {


    const myArray = [
        { open: 135.23, high: 137.45, low: 134.56, sma_200: 125.34, sma_100: 130.56 },
        { open: 136.45, high: 138.67, low: 135.67, sma_200: 126.78, sma_100: 131.45 },
        { open: 137.89, high: 139.34, low: 136.34, sma_200: 127.56, sma_100: 132.78 }
    ];
    
    const xCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const { open, high, low, sma_200, sma_100 } = curr;
    
        return {
            open,
            high,
            low,
            sma_200,
            sma_100
        };
    };
    
    const yCallbackFunc = ({ objRow, index }) => {
        const curr = objRow[index];
        const next = objRow[index + 1];
    
        if (typeof next === 'undefined') return null;
    
        return {
            label_1: next.open > curr.open,       // Label indicating if the next open price is higher than the current
            label_2: next.high > curr.high,       // Label indicating if the next high price is higher than the current
            label_3: next.low > curr.low,         // Label indicating if the next low price is higher than the current
            label_4: next.sma_200 > curr.sma_200, // Label indicating if the next 200-day SMA is higher than the current
            label_5: next.sma_100 > curr.sma_100  // Label indicating if the next 100-day SMA is higher than the current
        };
    };
    
    const trainingData = parseTrainingXY({
        arrObj: myArray,
        trainingSplit: 0.75,
        weights: { open: 1, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        yCallbackFunc,
        xCallbackFunc,
        forceScaling: 'normalization',
        timeSteps: 0
    });

    //console.log(JSON.stringify(trainingData))


    const productionData = parseProductionX({
        arrObj: myArray,
        weights: { open: 2, high: 1, low: 1, sma_200: 1, sma_100: 1 },
        xCallbackFunc,
        forceScaling: null,
        timeSteps: 0
    })

    console.log(JSON.stringify(productionData))

}

test()