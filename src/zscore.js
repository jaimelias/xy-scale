const toArray = typedOrArray => Array.from(typedOrArray);

const normalizeStats = (stats, cols) => {
  const mean = new Float64Array(cols);
  const std = new Float64Array(cols);
  const scale = new Float64Array(cols);
  const count = new Uint32Array(cols);

  const meanIn = Array.isArray(stats?.mean) ? stats.mean : [];
  const stdIn = Array.isArray(stats?.std) ? stats.std : [];
  const scaleIn = Array.isArray(stats?.scale) ? stats.scale : [];
  const countIn = Array.isArray(stats?.count) ? stats.count : [];

  for (let j = 0; j < cols; j++) {
    const m = Number(meanIn[j]);
    const s = Number(stdIn[j]);
    const sc = Number(scaleIn[j]);
    const c = Number(countIn[j]);

    mean[j] = Number.isFinite(m) ? m : 0;
    std[j] = Number.isFinite(s) && s > 0 ? s : 0;
    count[j] = Number.isFinite(c) && c > 0 ? c : 0;

    if (Number.isFinite(sc) && sc > 0) {
      scale[j] = sc;
      if (!(std[j] > 0)) { std[j] = 1 / sc; }
    } else if (std[j] > 0) {
      scale[j] = 1 / std[j];
    } else {
      scale[j] = 0;
    }
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
    const variance = count[j] > 1 ? (m2[j] / count[j]) : 0;
    const s = variance > 0 ? Math.sqrt(variance) : 0;
    std[j] = s;
    scale[j] = s > 0 ? (1 / s) : 0;
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

      normalized[j] = (Number.isFinite(x) && sc > 0)
        ? (x - normalizedStats.mean[j]) * sc
        : 0;
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
    const normalizedStats = normalizeStats(stats ?? {}, 0);
    return {
      stats: {
        mean: toArray(normalizedStats.mean),
        std: toArray(normalizedStats.std),
        scale: toArray(normalizedStats.scale),
        count: toArray(normalizedStats.count)
      },
      data: []
    };
  }

  const firstRow = arr[0];
  if (!Array.isArray(firstRow)) {
    throw new TypeError('[zscore] "arr" must be a 2D array of rows.');
  }

  const cols = firstRow.length;
  const normalizedStats = stats ? normalizeStats(stats, cols) : fitStats(arr, cols);
  const data = scaleFromStats(arr, normalizedStats);

  return {
    stats: {
      mean: toArray(normalizedStats.mean),
      std: toArray(normalizedStats.std),
      scale: toArray(normalizedStats.scale),
      count: toArray(normalizedStats.count)
    },
    data
  };
};
