const toArray = typedOrArray => Array.from(typedOrArray);

const serializeStats = ({ mean, std, scale, count }) => ({
  mean: toArray(mean),
  std: toArray(std),
  scale: toArray(scale),
  count: toArray(count)
});

const validateStats = (stats, cols) => {
  if (stats === null || typeof stats !== 'object' || Array.isArray(stats)) {
    throw new TypeError('[zscore] "stats" must be an object containing mean, std, scale, and count arrays.');
  }

  for (const key of ['mean', 'std', 'scale', 'count']) {
    if (!Array.isArray(stats[key]) || stats[key].length !== cols) {
      throw new TypeError(`[zscore] "stats.${key}" must be an array with ${cols} items.`);
    }
  }

  const mean = new Float64Array(cols);
  const std = new Float64Array(cols);
  const scale = new Float64Array(cols);
  const count = new Uint32Array(cols);

  for (let j = 0; j < cols; j++) {
    const m = stats.mean[j];
    const s = stats.std[j];
    const sc = stats.scale[j];
    const c = stats.count[j];

    if (typeof m !== 'number' || !Number.isFinite(m) ||
        typeof s !== 'number' || !Number.isFinite(s) || s < 0 ||
        typeof sc !== 'number' || !Number.isFinite(sc) || sc < 0 ||
        !Number.isInteger(c) || c < 0 || c > 0xffffffff ||
        (s === 0) !== (sc === 0) ||
        (s > 0 && (c < 2 || Math.abs(s * sc - 1) > 8 * Number.EPSILON))) {
      throw new TypeError(`[zscore] Invalid fitted statistics at column ${j}.`);
    }

    mean[j] = m;
    std[j] = s;
    scale[j] = sc;
    count[j] = c;
  }

  return { mean, std, scale, count };
};

const fitStats = (arr, cols) => {
  const rows = arr.length;
  const mean = new Float64Array(cols);
  const m2 = new Float64Array(cols);
  const count = new Uint32Array(cols);

  for (let i = 0; i < rows; i++) {
    const row = arr[i];

    if (!Array.isArray(row)) {
      throw new TypeError(`[zscore] Invalid row at index=${i}. Expected an array.`);
    }
    if (row.length !== cols) {
      throw new Error(`[zscore] Inconsistent row size at index=${i}. Expected ${cols}, got ${row.length}.`);
    }

    for (let j = 0; j < cols; j++) {
      const x = Number(row[j]);
      if (!Number.isFinite(x)) { continue; }

      count[j]++;

      const delta = x - mean[j];
      mean[j] += delta / count[j];
      m2[j] += delta * (x - mean[j]);
    }
  }

  const std = new Float64Array(cols);
  const scale = new Float64Array(cols);

  for (let j = 0; j < cols; j++) {
    if (!Number.isFinite(mean[j]) || !Number.isFinite(m2[j])) {
      throw new RangeError(`[zscore] Cannot fit finite statistics at column ${j}.`);
    }

    const variance = count[j] > 1 ? (m2[j] / count[j]) : 0;
    const s = variance > 0 ? Math.sqrt(variance) : 0;
    std[j] = s;
    scale[j] = s > 0 ? (1 / s) : 0;

    if (!Number.isFinite(std[j]) || !Number.isFinite(scale[j])) {
      throw new RangeError(`[zscore] Cannot fit finite statistics at column ${j}.`);
    }
  }

  return { mean, std, scale, count };
};

const scaleFromStats = (arr, normalizedStats) => {
  const rows = arr.length;
  const cols = normalizedStats.mean.length;
  const out = new Array(rows);

  for (let i = 0; i < rows; i++) {
    const row = arr[i];

    if (!Array.isArray(row)) {
      throw new TypeError(`[zscore] Invalid row at index=${i}. Expected an array.`);
    }
    if (row.length !== cols) {
      throw new Error(`[zscore] Inconsistent row size at index=${i}. Expected ${cols}, got ${row.length}.`);
    }

    const normalized = new Array(cols);
    for (let j = 0; j < cols; j++) {
      const x = Number(row[j]);
      const sc = normalizedStats.scale[j];

      const scaled = (Number.isFinite(x) && sc > 0)
        ? (x - normalizedStats.mean[j]) * sc
        : 0;
      if (!Number.isFinite(scaled)) {
        throw new RangeError(`[zscore] Cannot scale row ${i}, column ${j} to a finite number.`);
      }
      normalized[j] = scaled;
    }

    out[i] = normalized;
  }

  return out;
};

export const zscore = (arr, stats = null) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('[zscore] "arr" must be a 2D array.');
  }

  if (arr.length === 0) {
    const normalizedStats = stats == null
      ? fitStats(arr, 0)
      : validateStats(stats, Array.isArray(stats?.mean) ? stats.mean.length : 0);
    return {
      stats: serializeStats(normalizedStats),
      data: []
    };
  }

  const firstRow = arr[0];
  if (!Array.isArray(firstRow)) {
    throw new TypeError('[zscore] "arr" must be a 2D array of rows.');
  }

  const cols = firstRow.length;
  const normalizedStats = stats == null ? fitStats(arr, cols) : validateStats(stats, cols);
  const data = scaleFromStats(arr, normalizedStats);

  return {
    stats: serializeStats(normalizedStats),
    data
  };
};
