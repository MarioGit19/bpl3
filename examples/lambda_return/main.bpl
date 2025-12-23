extern printf(fmt: string, ...);

type Adder = Func<int>(int);

frame make_adder(x: int) ret Adder {
    return |y: int| ret int {
        return x + y;
    };
}

frame main() ret int {
    local add5: Adder = make_adder(5);
    local res: int = add5(10);
    printf("Result: %d\n", res);
    return 0;
}
