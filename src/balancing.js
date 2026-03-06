const isValidLabelValue = (value) => {
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);

  if (Array.isArray(value)) {
    return value.every(isValidLabelValue);
  }

  return false;
};

const makeLabelKey = (label) => {
  if (!isValidLabelValue(label)) {
    throw new Error(
      "Invalid Y label. Allowed types: finite numbers, strings, booleans, or nested arrays of those."
    );
  }

  return JSON.stringify(label);
};

const validateXY = (X, Y) => {
  if (!Array.isArray(X) || !Array.isArray(Y)) {
    throw new Error("X and Y must be arrays.");
  }

  if (X.length !== Y.length) {
    throw new Error("X and Y must have the same length.");
  }

  if (X.length === 0) {
    throw new Error("X and Y cannot be empty.");
  }
};

const mulberry32 = (seed) => {
  let t = seed >>> 0;

  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const resolveRandom = ({ random, seed } = {}) => {
  if (typeof random === "function") return random;
  if (Number.isInteger(seed)) return mulberry32(seed);
  return Math.random;
};

const shuffleInPlace = (arr, random = Math.random) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

const sampleWithoutReplacement = (samples, size, random = Math.random) => {
  if (size > samples.length) {
    throw new Error("Cannot sample more items than available without replacement.");
  }

  const copy = [...samples];
  shuffleInPlace(copy, random);
  return copy.slice(0, size);
};

const sampleWithReplacement = (samples, size, random = Math.random) => {
  if (samples.length === 0) {
    throw new Error("Cannot sample from an empty array.");
  }

  const out = [];

  for (let i = 0; i < size; i++) {
    const idx = Math.floor(random() * samples.length);
    out.push(samples[idx]);
  }

  return out;
};

const maybeClone = (value, clone) => {
  if (!clone) return value;
  return structuredClone(value);
};

const groupXYByLabel = (X, Y, { cloneX = false } = {}) => {
  validateXY(X, Y);

  const groups = new Map();

  Y.forEach((label, i) => {
    const key = makeLabelKey(label);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push({
      x: maybeClone(X[i], cloneX),
      y: label,
    });
  });

  return groups;
};

export const oversampleXY = (X, Y, options = {}) => {
  const {
    random,
    seed,
    shuffleResult = true,
    cloneX = false,
  } = options;

  const rng = resolveRandom({ random, seed });
  const groups = groupXYByLabel(X, Y, { cloneX });

  const counts = [...groups.values()].map((samples) => samples.length);
  const maxCount = Math.max(...counts);

  const combined = [];

  for (const samples of groups.values()) {
    const originals = [...samples];
    const extrasNeeded = maxCount - originals.length;

    const extras =
      extrasNeeded > 0
        ? sampleWithReplacement(samples, extrasNeeded, rng).map((sample) => ({
            x: maybeClone(sample.x, cloneX),
            y: sample.y,
          }))
        : [];

    combined.push(...originals, ...extras);
  }

  if (shuffleResult) {
    shuffleInPlace(combined, rng);
  }

  return {
    X: combined.map(({ x }) => x),
    Y: combined.map(({ y }) => y),
  };
};

export const undersampleXY = (X, Y, options = {}) => {
  const {
    random,
    seed,
    shuffleResult = true,
    cloneX = false,
  } = options;

  const rng = resolveRandom({ random, seed });
  const groups = groupXYByLabel(X, Y, { cloneX });

  const counts = [...groups.values()].map((samples) => samples.length);
  const minCount = Math.min(...counts);

  const combined = [];

  for (const samples of groups.values()) {
    const selected = sampleWithoutReplacement(samples, minCount, rng).map((sample) => ({
      x: maybeClone(sample.x, cloneX),
      y: sample.y,
    }));

    combined.push(...selected);
  }

  if (shuffleResult) {
    shuffleInPlace(combined, rng);
  }

  return {
    X: combined.map(({ x }) => x),
    Y: combined.map(({ y }) => y),
  };
};