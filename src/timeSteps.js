export const arrayToTimesteps = (arr, timeSteps) => {
    if (timeSteps === 0) return arr;
    if (timeSteps < 0) throw new Error("timeSteps must be greater than 0");
    
    const timestepsArray = [];
    
    for (let i = 0; i <= arr.length - timeSteps; i++) {
        timestepsArray.push(arr.slice(i, i + timeSteps));
    }
    
    return timestepsArray;
}


export const timeStepsToArray = (arr, timeSteps) => {
    if (timeSteps === 0) return arr;
    if (timeSteps < 0) throw new Error("timeSteps must be greater than 0");

    const result = [];

    // Start by adding all elements of the first timestep
    result.push(...arr[0]);

    // For each subsequent timestep, add only the last element
    for (let i = 1; i < arr.length; i++) {
        result.push(arr[i][timeSteps - 1]);
    }

    return result;
};
