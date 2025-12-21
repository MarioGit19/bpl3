function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

function main() {
  const n = 40;
  const result = fib(n);
  console.log(`Fib(${n}) = ${result}`);
}

main();
