function main() {
  const size = 300;
  const totalElements = size * size;

  // Use TypedArray for performance closer to C/BPL
  const a = new Float64Array(totalElements); // JS numbers are doubles, but we want 64-bit int behavior mostly
  const b = new Float64Array(totalElements);
  const c = new Float64Array(totalElements);

  // Initialize
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const idx = i * size + j;
      a[idx] = i + j;
      b[idx] = i - j;
    }
  }

  // Multiply
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let k = 0; k < size; k++) {
        sum += a[i * size + k] * b[k * size + j];
      }
      c[i * size + j] = sum;
    }
  }

  // Verify
  let resultSum = 0;
  for (let i = 0; i < totalElements; i++) {
    resultSum += c[i];
  }

  console.log(`Matrix ${size}x${size} sum: ${resultSum}`);
}

main();
