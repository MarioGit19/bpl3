function main() {
  const limit = 10000000;
  const size = limit + 1;
  // Use Uint8Array for better performance and memory usage, similar to bool array
  const isPrime = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    isPrime[i] = 1;
  }

  isPrime[0] = 0;
  isPrime[1] = 0;

  for (let p = 2; p * p <= limit; p++) {
    if (isPrime[p]) {
      for (let j = p * p; j <= limit; j += p) {
        isPrime[j] = 0;
      }
    }
  }

  let count = 0;
  for (let i = 0; i <= limit; i++) {
    if (isPrime[i]) {
      count++;
    }
  }

  console.log(`Primes up to ${limit}: ${count}`);
}

main();
