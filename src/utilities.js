export const xyArrayShuffle = (X, Y) => {
    if (X.length !== Y.length) {
        throw new Error("X and Y arrays must have the same length");
    }

    // Create an array of indices based on the length of X or Y
    const indices = Array.from({ length: X.length }, (_, i) => i);

    // Shuffle the indices using Fisher-Yates shuffle algorithm
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Use the shuffled indices to rearrange X and Y
    const shuffledX = indices.map(i => X[i]);
    const shuffledY = indices.map(i => Y[i]);

    return { shuffledX, shuffledY };
}

export const arrayShuffle = X => {
    // Make a copy of the array to avoid mutating the original
    const shuffledX = [...X];

    // Shuffle using Fisher-Yates algorithm
    for (let i = shuffledX.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledX[i], shuffledX[j]] = [shuffledX[j], shuffledX[i]];
    }

    return shuffledX;
}