extern printf(fmt: string, ...);

frame main() ret int {
    local x: int = 10;
    local f: Func<int>(int) = |y: int| ret int {
        return x + y;
    };

    local res: int = f(5);
    printf("Result: %d\n", res);
    return 0;
}
