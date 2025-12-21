function main() {
  let sum = 0;
  // Loop 100 million times
  for (let i = 0; i < 100000000; i++) {
    sum++;
  }

  // Prevent optimization
  if (sum == 0) {
    console.log("Sum is zero");
  }
  return sum;
}

main();
