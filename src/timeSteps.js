export const arrayToTimesteps = (arr, timeSteps) => {
    if (timeSteps === 0) return arr;
    if (timeSteps < 0) throw new Error("timeSteps must be greater than 0");
    
    const timestepsArray = [];
    
    for (let i = 0; i <= arr.length - timeSteps; i++) {
        timestepsArray.push(arr.slice(i, i + timeSteps));
    }
    
    return timestepsArray;
}