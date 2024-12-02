export const oversampleXY = (X, Y) => {

    const labelCounts = {};
    const data = {};
  
    // Count occurrences of each label and group by label
    Y.forEach((label, i) => {
      if (!labelCounts[label]) {
        labelCounts[label] = 0;
        data[label] = [];
      }
      labelCounts[label]++;
      data[label].push([X[i], Y[i]]);
    });
  
    // Find the max label count
    const maxCount = Math.max(...Object.values(labelCounts));
  
    const oversampledX = [];
    const oversampledY = [];
  
    // Oversample each label to match the max count
    Object.keys(data).forEach(label => {
      const samples = data[label];
      const numSamples = samples.length;
  
      for (let i = 0; i < maxCount; i++) {
        const sample = samples[i % numSamples]; // Cycle through samples
        oversampledX.push(sample[0]);
        oversampledY.push(sample[1]);
      }
    });
  
    return { X: oversampledX, Y: oversampledY };
  }
  

export const undersampleXY = (X, Y) => {

    const labelCounts = {};
    const data = {};
  
    // Count occurrences of each label and group by label
    Y.forEach((label, i) => {
      if (!labelCounts[label]) {
        labelCounts[label] = 0;
        data[label] = [];
      }
      labelCounts[label]++;
      data[label].push([X[i], Y[i]]);
    });
  
    // Find the minimum label count
    const minCount = Math.min(...Object.values(labelCounts));
  
    const undersampledX = [];
    const undersampledY = [];
  
    // Undersample each label to match the minimum count
    Object.keys(data).forEach(label => {
      const samples = data[label];
      for (let i = 0; i < minCount; i++) {
        const sample = samples[i]; // Use first minCount samples
        undersampledX.push(sample[0]);
        undersampledY.push(sample[1]);
      }
    });
  
    return { X: undersampledX, Y: undersampledY };
  }
  