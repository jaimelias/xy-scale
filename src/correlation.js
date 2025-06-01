import { sum } from "@tensorflow/tfjs-node";

export const analizeCorrelation = ({arrObj, corrSplit, corrExcludes, corrThreshold}) => {
  const n = Math.floor(arrObj.length * corrSplit);
  if (n < 2) return [];

  const keys = Object.keys(arrObj[0]).filter(k => !corrExcludes.has(k));
  const m = keys.length;

  console.log({m})

  // running sums, sums of squares, and cross‐sums
  const sums   = new Float64Array(m); // by default Float64Array are filled with 0
  const sumsq  = new Float64Array(m); // by default Float64Array are filled with 0
  const sumxy  = Array.from({ length: m }, () => new Float64Array(m));

  // 1 pass: accumulate sums, sumsq, and sumxy[i][j] (i<j)
  for (let r = 0; r < n; r++) {
    const row = arrObj[r];
    for (let i = 0; i < m; i++) {

      const xi = row[keys[i]];
      
      //errror here, the code neve reaches this part

      sums[i]  += xi;
      sumsq[i] += xi * xi;
      for (let j = i + 1; j < m; j++) {
        sumxy[i][j] += xi * row[keys[j]];
      }
    }
  }

  // precompute denominators: n*Σx² − (Σx)²
  const denom = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    denom[i] = n * sumsq[i] - sums[i] * sums[i];
  }

  // build result pairs
  // collect pairs below/above your threshold
  let lowCorrelationPairs  = `Low Correlation Pairs (< ${corrThreshold}):`;
  let highCorrelationPairs = `High Correlation Pairs (>= ${corrThreshold}):`;

  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      const cov  = n * sumxy[i][j] - sums[i] * sums[j];
      const corr = cov / Math.sqrt(denom[i] * denom[j]);
      const pair = `\n${keys[i]} - ${keys[j]}: ${corr}`

      if(corr < corrThreshold)
      {
        lowCorrelationPairs += pair
      }
      else {
        highCorrelationPairs += pair
      }
    }
  }

  console.log(lowCorrelationPairs)
  console.log('---')
  console.log(highCorrelationPairs)

  return true;
};
