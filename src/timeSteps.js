export const arrayToTimesteps = (arr, timeSteps, step = 1) => {
  // Validation
  if (!Array.isArray(arr)) {
    throw new Error('arr must be an array');
  }
  if (!Number.isInteger(timeSteps) || timeSteps <= 0) {
    throw new Error('timeSteps must be a positive integer');
  }
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error('step must be a positive integer');
  }

  // If no windows possible, return empty array
  if (timeSteps > arr.length) {
    return [];
  }

  const timestepsArray = [];
  for (let i = 0; i <= arr.length - timeSteps; i += step) {
    timestepsArray.push(arr.slice(i, i + timeSteps));
  }
  return timestepsArray;
};