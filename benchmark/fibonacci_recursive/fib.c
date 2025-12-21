#include <stdio.h>

long long fib(long long n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    long long n = 40;
    long long result = fib(n);
    printf("Fib(%lld) = %lld\n", n, result);
    return 0;
}
