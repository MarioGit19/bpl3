extern printf(f: string, ...) ret int;

frame main() ret int {
    local i: int = 0;
    local sum: int = 0;
    # Loop 100 million times
    loop (i < 100000000) {
        sum = sum + 1;
        i = i + 1;
    }

    # Prevent optimization
    if (sum == 0) {
        printf("Sum is zero");
    }
    return sum;
}
