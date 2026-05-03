
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

export const arrayShuffleXY = (X, Y) => {
    if (!Array.isArray(X) || !Array.isArray(Y)) {
        throw new TypeError('Both X and Y must be arrays');
    }

    if (X.length !== Y.length) {
        throw new Error('X and Y must have the same length');
    }

    // Copy to avoid mutating the originals
    const shuffledX = [...X];
    const shuffledY = [...Y];

    // Shuffle both arrays using the same swaps
    for (let i = shuffledX.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffledX[i], shuffledX[j]] = [shuffledX[j], shuffledX[i]];
        [shuffledY[i], shuffledY[j]] = [shuffledY[j], shuffledY[i]];
    }

    return { X: shuffledX, Y: shuffledY };
};