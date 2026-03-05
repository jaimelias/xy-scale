export const isBadNumber = (v) => v == null || !Number.isFinite(v)

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