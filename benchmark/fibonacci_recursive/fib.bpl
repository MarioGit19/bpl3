extern printf(fmt: string, ...);

frame fib(n: int) ret int {
    if (n < 2) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}

frame main() ret int {
    local n: int = 40;
    local result: int = fib(n);
    printf("Fib(%d) = %d\n", n, result);
    return 0;
}
